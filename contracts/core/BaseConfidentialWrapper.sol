// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AssetTypes} from "../assets/AssetTypes.sol";
import {BaseConfidentialToken} from "./BaseConfidentialToken.sol";
import {INoxExecutor} from "../interfaces/INoxExecutor.sol";

interface IConfidentialTradeReceiver {
    function settleIncomingAssetTrade(
        address operator,
        address from,
        address to,
        bytes32 amount,
        bytes32 tradeId,
        bytes calldata data
    ) external returns (bytes32 actualAmount);
}

/// @notice ERC-7984-style confidential wrapper for any factory-deployed asset.
contract BaseConfidentialWrapper is AccessControl, ReentrancyGuard, IConfidentialTradeReceiver {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    BaseConfidentialToken public immutable underlying;
    INoxExecutor public immutable nox;
    AssetTypes.AssetCategory public immutable category;
    string public name;
    string public symbol;

    bytes32 private confidentialSupply;
    mapping(address => bytes32) private encryptedBalances;
    mapping(address => mapping(address => uint48)) private operatorUntil;
    mapping(uint256 => bool) public usedNoxNonce;

    uint256 public nextDividendId = 1;
    uint256 public nextProposalId = 1;

    struct Proposal {
        string description;
        address[] affectedAssets;
        uint256 votingDeadline;
        bool finalized;
    }

    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => mapping(address => bytes32)) public delegatedVotingPower;

    event ConfidentialTransfer(address indexed asset, address indexed from, address indexed to);
    event AssetWrapped(address indexed asset, address indexed user);
    event AssetUnwrapped(address indexed asset, address indexed user);
    event AssetTradeSettled(
        bytes32 indexed tradeId,
        address indexed initiator,
        address indexed counterparty,
        address payAsset,
        address receiveAsset
    );
    event DividendDistributed(address indexed asset, uint256 indexed dividendId, address indexed holder);
    event ProposalCreated(uint256 indexed proposalId, address[] affectedAssets, uint256 votingDeadline);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event ProposalFinalized(uint256 indexed proposalId);
    event VotingPowerDelegated(address indexed holder, address indexed delegate);
    event CollateralLocked(address indexed user, address[] assets);
    event CollateralVerified(address indexed user, bytes32 indexed balanceHandle);
    event OperatorSet(address indexed holder, address indexed operator, uint48 until);

    constructor(BaseConfidentialToken underlying_, INoxExecutor nox_, address admin) {
        require(address(underlying_) != address(0), "zero underlying");
        require(address(nox_) != address(0), "zero nox");
        require(admin != address(0), "zero admin");

        underlying = underlying_;
        nox = nox_;
        category = underlying_.category();
        name = string.concat("Confidential Wrapped ", underlying_.name());
        symbol = string.concat("w", underlying_.symbol());

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    function confidentialTotalSupply() external view returns (bytes32 encryptedTotalSupply) {
        return confidentialSupply;
    }

    function confidentialBalanceOf(address account) external view returns (bytes32 encryptedBalance) {
        return encryptedBalances[account];
    }

    function getEncryptedBalance(address account) external view returns (bytes32 encryptedBalance) {
        return encryptedBalances[account];
    }

    function isOperator(address holder, address operator) public view returns (bool authorized) {
        return holder == operator || operatorUntil[holder][operator] >= block.timestamp;
    }

    function setOperator(address operator, uint48 until) external {
        require(operator != address(0), "zero operator");
        operatorUntil[msg.sender][operator] = until;
        emit OperatorSet(msg.sender, operator, until);
    }

    function wrap(uint256 amount, bytes calldata noxData) external nonReentrant returns (bytes32 encryptedAmount) {
        require(amount > 0, "zero amount");

        INoxExecutor.WrapResult memory result =
            nox.verifyWrap(address(this), msg.sender, amount, encryptedBalances[msg.sender], confidentialSupply, noxData);
        _useNoxNonce(result.nonce, result.deadline);

        encryptedBalances[msg.sender] = result.accountBalanceAfter;
        confidentialSupply = result.totalSupplyAfter;
        encryptedAmount = result.mintedAmount;

        require(underlying.transferFrom(msg.sender, address(this), amount), "deposit failed");

        emit ConfidentialTransfer(address(underlying), address(0), msg.sender);
        emit AssetWrapped(address(underlying), msg.sender);
    }

    function unwrap(bytes32 encryptedAmount, bytes calldata noxData) external nonReentrant returns (uint256 amount) {
        require(encryptedAmount != bytes32(0), "zero handle");

        INoxExecutor.UnwrapResult memory result = nox.verifyUnwrap(
            address(this), msg.sender, encryptedAmount, encryptedBalances[msg.sender], confidentialSupply, noxData
        );
        _useNoxNonce(result.nonce, result.deadline);

        encryptedBalances[msg.sender] = result.accountBalanceAfter;
        confidentialSupply = result.totalSupplyAfter;
        amount = result.plaintextAmount;

        require(underlying.transfer(msg.sender, amount), "withdraw failed");

        emit ConfidentialTransfer(address(underlying), msg.sender, address(0));
        emit AssetUnwrapped(address(underlying), msg.sender);
    }

    function confidentialTransfer(address to, bytes32 encryptedAmount, bytes calldata noxData)
        external
        nonReentrant
        returns (bytes32 actualAmount)
    {
        return _confidentialTransfer(msg.sender, msg.sender, to, encryptedAmount, noxData);
    }

    function confidentialTransferFrom(address from, address to, bytes32 encryptedAmount, bytes calldata noxData)
        external
        nonReentrant
        returns (bytes32 actualAmount)
    {
        require(isOperator(from, msg.sender), "not operator");
        return _confidentialTransfer(msg.sender, from, to, encryptedAmount, noxData);
    }

    function approveConfidential(address spender, bytes calldata encryptedAmount) external returns (bool) {
        require(spender != address(0), "zero spender");
        require(encryptedAmount.length == 32, "bad amount");
        delegatedVotingPower[msg.sender][spender] = abi.decode(encryptedAmount, (bytes32));
        emit VotingPowerDelegated(msg.sender, spender);
        return true;
    }

    function settleAssetTrade(
        address counterparty,
        address receiveWrapper,
        bytes32 encryptedPayAmount,
        bytes32 encryptedReceiveAmount,
        bytes calldata payNoxData,
        bytes calldata receiveNoxData
    ) external nonReentrant returns (bytes32 tradeId) {
        require(counterparty != address(0), "zero counterparty");
        require(receiveWrapper != address(0), "zero receive wrapper");
        require(receiveWrapper != address(this), "same wrapper");

        tradeId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                receiveWrapper,
                msg.sender,
                counterparty,
                encryptedPayAmount,
                encryptedReceiveAmount,
                block.number
            )
        );

        _confidentialTransfer(msg.sender, msg.sender, counterparty, encryptedPayAmount, payNoxData);
        IConfidentialTradeReceiver(receiveWrapper).settleIncomingAssetTrade(
            address(this), counterparty, msg.sender, encryptedReceiveAmount, tradeId, receiveNoxData
        );

        emit AssetTradeSettled(tradeId, msg.sender, counterparty, address(underlying), receiveWrapper);
    }

    function settleIncomingAssetTrade(
        address operator,
        address from,
        address to,
        bytes32 amount,
        bytes32 tradeId,
        bytes calldata data
    ) external nonReentrant returns (bytes32 actualAmount) {
        require(operator != address(0), "zero operator");
        require(tradeId != bytes32(0), "zero trade");
        require(isOperator(from, msg.sender), "wrapper not operator");
        actualAmount = _confidentialTransfer(operator, from, to, amount, data);
    }

    function hasMinimumBalance(address user, uint256 encryptedThreshold) external view returns (bool allowed) {
        return nox.hasMinimumBalance(address(this), user, msg.sender, encryptedBalances[user], bytes32(encryptedThreshold));
    }

    function hasMinimumPortfolioValue(address user, bytes calldata encryptedThreshold, address[] calldata wrappers)
        external
        view
        returns (bool allowed)
    {
        require(encryptedThreshold.length == 32, "bad threshold");
        (allowed,) = nox.verifyPortfolioValue(wrappers, user, abi.decode(encryptedThreshold, (bytes32)));
    }

    function getUserTier(address user, bytes calldata encryptedThreshold, address[] calldata wrappers)
        external
        view
        returns (uint8 tier)
    {
        require(encryptedThreshold.length == 32, "bad threshold");
        (, tier) = nox.verifyPortfolioValue(wrappers, user, abi.decode(encryptedThreshold, (bytes32)));
    }

    function distributeDividend(address[] calldata holders, bytes[] calldata encryptedAmounts, bytes calldata noxData)
        external
        onlyRole(OPERATOR_ROLE)
        nonReentrant
        returns (uint256 dividendId)
    {
        require(category != AssetTypes.AssetCategory.COMMODITY, "dividends disabled");
        require(holders.length == encryptedAmounts.length, "length mismatch");
        require(holders.length > 0, "empty distribution");

        bytes32[] memory amounts = new bytes32[](holders.length);
        bytes32[] memory balances = new bytes32[](holders.length);
        for (uint256 i = 0; i < holders.length; i++) {
            require(holders[i] != address(0), "zero holder");
            require(encryptedAmounts[i].length == 32, "bad amount");
            amounts[i] = abi.decode(encryptedAmounts[i], (bytes32));
            balances[i] = encryptedBalances[holders[i]];
        }

        INoxExecutor.DividendResult memory result =
            nox.verifyDividendDistribution(address(this), holders, amounts, balances, confidentialSupply, noxData);
        _useNoxNonce(result.nonce, result.deadline);
        require(result.holderBalancesAfter.length == holders.length, "bad result");

        dividendId = nextDividendId++;
        confidentialSupply = result.totalSupplyAfter;
        for (uint256 i = 0; i < holders.length; i++) {
            encryptedBalances[holders[i]] = result.holderBalancesAfter[i];
            emit DividendDistributed(address(underlying), dividendId, holders[i]);
            emit ConfidentialTransfer(address(underlying), address(0), holders[i]);
        }
    }

    function verifyCollateral(address user) external returns (bytes memory proof) {
        proof = nox.verifyCollateral(address(this), user, msg.sender, encryptedBalances[user]);
        emit CollateralVerified(user, encryptedBalances[user]);
    }

    function lockCollateral(address[] calldata assetAddresses, bytes[] calldata encryptedAmounts) external {
        require(assetAddresses.length == encryptedAmounts.length, "length mismatch");
        require(assetAddresses.length > 0, "empty collateral");
        for (uint256 i = 0; i < encryptedAmounts.length; i++) {
            require(encryptedAmounts[i].length == 32, "bad amount");
        }
        emit CollateralLocked(msg.sender, assetAddresses);
    }

    function borrowAgainstCollateral(bytes calldata encryptedLoanAmount, address loanAsset, bytes calldata collateralProof)
        external
    {
        require(encryptedLoanAmount.length == 32, "bad loan amount");
        require(loanAsset != address(0), "zero loan asset");
        require(collateralProof.length > 0, "missing proof");
        emit CollateralLocked(msg.sender, _singleAsset(loanAsset));
    }

    function repayLoan(bytes calldata encryptedRepayAmount, address loanAsset) external {
        require(encryptedRepayAmount.length == 32, "bad repay amount");
        require(loanAsset != address(0), "zero loan asset");
        emit ConfidentialTransfer(loanAsset, msg.sender, address(this));
    }

    function liquidatePosition(address user) external onlyRole(OPERATOR_ROLE) {
        require(user != address(0), "zero user");
        emit CollateralVerified(user, encryptedBalances[user]);
    }

    function createProposal(string calldata description, address[] calldata affectedAssets, uint256 votingDeadline)
        external
        returns (uint256 proposalId)
    {
        require(bytes(description).length != 0, "empty description");
        require(votingDeadline > block.timestamp, "bad deadline");
        require(encryptedBalances[msg.sender] != bytes32(0), "holder only");

        proposalId = nextProposalId++;
        Proposal storage proposal = proposals[proposalId];
        proposal.description = description;
        proposal.votingDeadline = votingDeadline;
        for (uint256 i = 0; i < affectedAssets.length; i++) {
            proposal.affectedAssets.push(affectedAssets[i]);
        }

        emit ProposalCreated(proposalId, affectedAssets, votingDeadline);
    }

    function castConfidentialVote(uint256 proposalId, bytes calldata encryptedVote, bytes calldata encryptedWeight)
        external
    {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.votingDeadline >= block.timestamp, "voting closed");
        require(!hasVoted[proposalId][msg.sender], "already voted");
        require(encryptedVote.length == 32, "bad vote");
        require(encryptedWeight.length == 32, "bad weight");
        require(encryptedBalances[msg.sender] != bytes32(0), "no voting power");

        hasVoted[proposalId][msg.sender] = true;
        emit VoteCast(proposalId, msg.sender);
    }

    function finalizeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.votingDeadline != 0, "unknown proposal");
        require(block.timestamp > proposal.votingDeadline, "voting active");
        require(!proposal.finalized, "finalized");
        proposal.finalized = true;
        emit ProposalFinalized(proposalId);
    }

    function delegateVotingPower(address delegate, bytes calldata encryptedAmount) external {
        require(delegate != address(0), "zero delegate");
        require(encryptedAmount.length == 32, "bad amount");
        delegatedVotingPower[msg.sender][delegate] = abi.decode(encryptedAmount, (bytes32));
        emit VotingPowerDelegated(msg.sender, delegate);
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (string memory description, address[] memory affectedAssets, uint256 votingDeadline, bool finalized)
    {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.description, proposal.affectedAssets, proposal.votingDeadline, proposal.finalized);
    }

    function decryptBalance(address owner, bytes calldata noxData) external view returns (uint256 plaintextBalance) {
        return nox.decryptBalance(address(this), owner, msg.sender, encryptedBalances[owner], noxData);
    }

    function _confidentialTransfer(address operator, address from, address to, bytes32 amount, bytes memory data)
        internal
        returns (bytes32 actualAmount)
    {
        require(to != address(0), "zero recipient");
        require(amount != bytes32(0), "zero handle");

        INoxExecutor.TransferResult memory result = nox.verifyTransfer(
            address(this),
            operator,
            from,
            to,
            amount,
            encryptedBalances[from],
            encryptedBalances[to],
            confidentialSupply,
            data
        );
        _useNoxNonce(result.nonce, result.deadline);

        encryptedBalances[from] = result.fromBalanceAfter;
        encryptedBalances[to] = result.toBalanceAfter;
        confidentialSupply = result.totalSupplyAfter;
        actualAmount = result.actualAmount;

        emit ConfidentialTransfer(address(underlying), from, to);
    }

    function _useNoxNonce(uint256 nonce, uint48 deadline) internal {
        require(deadline >= block.timestamp, "nox proof expired");
        require(!usedNoxNonce[nonce], "nox nonce used");
        usedNoxNonce[nonce] = true;
    }

    function _singleAsset(address asset) internal pure returns (address[] memory assets) {
        assets = new address[](1);
        assets[0] = asset;
    }
}
