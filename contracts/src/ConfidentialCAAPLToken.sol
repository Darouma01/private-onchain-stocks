// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CAAPLToken, IIdentityRegistry} from "./CAAPL3643Suite.sol";

/// @notice Encrypted amount pointer type used by ERC-7984 and resolved by Nox off-chain.
type euint256 is bytes32;

/// @notice Encrypted boolean pointer type returned by Nox for callback success and disclosure authorization.
type ebool is bytes32;

/// @notice ERC-7984 confidential token receiver callback.
interface IERC7984Receiver {
    /// @notice Handles a confidential token transfer with callback data.
    /// @param operator The caller that initiated the transfer.
    /// @param from The holder whose confidential balance was debited.
    /// @param amount The encrypted pointer for the actual transferred amount.
    /// @param data Application callback data.
    /// @return success Encrypted boolean pointer. Nox resolves this off-chain; non-zero means accepted in this stubbed integration.
    function onConfidentialTransferReceived(address operator, address from, bytes32 amount, bytes calldata data)
        external
        returns (bytes32 success);
}

/// @notice Receiver interface used to settle the second leg of an atomic confidential stock trade.
interface IConfidentialStockTradeReceiver {
    /// @notice Settles the incoming leg of an atomic confidential stock trade.
    /// @param operator The token contract that initiated the trade.
    /// @param from The counterparty debited on this token.
    /// @param to The original trade initiator credited on this token.
    /// @param amount The encrypted amount pointer for this token leg.
    /// @param tradeId The cross-token trade id.
    /// @param data Nox proof and encrypted state transition data for this token.
    /// @return actualAmount The encrypted amount pointer accepted for this leg.
    function settleIncomingStockTrade(
        address operator,
        address from,
        address to,
        bytes32 amount,
        bytes32 tradeId,
        bytes calldata data
    ) external returns (bytes32 actualAmount);
}

/// @notice ERC-7984 confidential fungible token interface.
interface IERC7984 {
    /// @notice Emitted whenever confidential tokens move, including zero-value transfers and mints/burns.
    event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount);

    /// @notice Emitted whenever a holder sets an operator expiry.
    event OperatorSet(address indexed holder, address indexed operator, uint48 until);

    /// @notice Emitted when a pointer amount is disclosed by implementation-specific authorization.
    event AmountDisclosed(bytes32 indexed handle, uint256 amount);

    /// @notice Returns the confidential token name.
    /// @return tokenName The token name.
    function name() external view returns (string memory tokenName);

    /// @notice Returns the confidential token symbol.
    /// @return tokenSymbol The token symbol.
    function symbol() external view returns (string memory tokenSymbol);

    /// @notice Returns token decimals as plaintext metadata.
    /// @return tokenDecimals The token decimal count.
    function decimals() external view returns (uint8 tokenDecimals);

    /// @notice Returns the ERC-7572-style contract metadata URI.
    /// @return uri The metadata URI.
    function contractURI() external view returns (string memory uri);

    /// @notice Returns the encrypted total supply pointer.
    /// @return encryptedTotalSupply The encrypted total supply handle.
    function confidentialTotalSupply() external view returns (bytes32 encryptedTotalSupply);

    /// @notice Returns an account's encrypted balance pointer.
    /// @param account The account to query.
    /// @return encryptedBalance The encrypted balance handle.
    function confidentialBalanceOf(address account) external view returns (bytes32 encryptedBalance);

    /// @notice Returns whether an operator is currently authorized for a holder.
    /// @param holder The token holder.
    /// @param spender The operator.
    /// @return authorized True when spender is authorized.
    function isOperator(address holder, address spender) external view returns (bool authorized);

    /// @notice Authorizes an operator until a timestamp.
    /// @param operator The operator address.
    /// @param until The authorization expiry timestamp.
    function setOperator(address operator, uint48 until) external;

    /// @notice Transfers a confidential amount from the caller to a recipient.
    /// @param to The recipient address.
    /// @param amount The encrypted amount pointer.
    /// @return actualAmount The encrypted pointer for the actual transferred amount.
    function confidentialTransfer(address to, bytes32 amount) external returns (bytes32 actualAmount);

    /// @notice Transfers a confidential amount from the caller to a recipient with proof data.
    /// @param to The recipient address.
    /// @param amount The encrypted amount pointer.
    /// @param data Nox proof and encrypted state transition data.
    /// @return actualAmount The encrypted pointer for the actual transferred amount.
    function confidentialTransfer(address to, bytes32 amount, bytes calldata data)
        external
        returns (bytes32 actualAmount);

    /// @notice Transfers a confidential amount on behalf of a holder.
    /// @param from The holder address.
    /// @param to The recipient address.
    /// @param amount The encrypted amount pointer.
    /// @return actualAmount The encrypted pointer for the actual transferred amount.
    function confidentialTransferFrom(address from, address to, bytes32 amount)
        external
        returns (bytes32 actualAmount);

    /// @notice Transfers a confidential amount on behalf of a holder with proof data.
    /// @param from The holder address.
    /// @param to The recipient address.
    /// @param amount The encrypted amount pointer.
    /// @param data Nox proof and encrypted state transition data.
    /// @return actualAmount The encrypted pointer for the actual transferred amount.
    function confidentialTransferFrom(address from, address to, bytes32 amount, bytes calldata data)
        external
        returns (bytes32 actualAmount);

    /// @notice Transfers a confidential amount and calls the recipient callback.
    /// @param to The recipient address.
    /// @param amount The encrypted amount pointer.
    /// @param callData Callback data passed to the recipient.
    /// @return actualAmount The encrypted pointer for the actual transferred amount.
    function confidentialTransferAndCall(address to, bytes32 amount, bytes calldata callData)
        external
        returns (bytes32 actualAmount);

    /// @notice Transfers a confidential amount with proof data and calls the recipient callback.
    /// @param to The recipient address.
    /// @param amount The encrypted amount pointer.
    /// @param data Nox proof and encrypted state transition data.
    /// @param callData Callback data passed to the recipient.
    /// @return actualAmount The encrypted pointer for the actual transferred amount.
    function confidentialTransferAndCall(address to, bytes32 amount, bytes calldata data, bytes calldata callData)
        external
        returns (bytes32 actualAmount);

    /// @notice Transfers a confidential amount on behalf of a holder and calls the recipient callback.
    /// @param from The holder address.
    /// @param to The recipient address.
    /// @param amount The encrypted amount pointer.
    /// @param callData Callback data passed to the recipient.
    /// @return actualAmount The encrypted pointer for the actual transferred amount.
    function confidentialTransferFromAndCall(address from, address to, bytes32 amount, bytes calldata callData)
        external
        returns (bytes32 actualAmount);

    /// @notice Transfers a confidential amount on behalf of a holder with proof data and calls the recipient callback.
    /// @param from The holder address.
    /// @param to The recipient address.
    /// @param amount The encrypted amount pointer.
    /// @param data Nox proof and encrypted state transition data.
    /// @param callData Callback data passed to the recipient.
    /// @return actualAmount The encrypted pointer for the actual transferred amount.
    function confidentialTransferFromAndCall(
        address from,
        address to,
        bytes32 amount,
        bytes calldata data,
        bytes calldata callData
    ) external returns (bytes32 actualAmount);
}

/// @notice Nox TEE verifier interface used by the confidential cAAPL wrapper.
interface INoxConfidentialExecutor {
    /// @notice Result of a Nox encrypted balance transition.
    struct TransferResult {
        bytes32 actualAmount;
        bytes32 fromBalanceAfter;
        bytes32 toBalanceAfter;
        bytes32 totalSupplyAfter;
        uint256 nonce;
        uint48 deadline;
    }

    /// @notice Result of wrapping plaintext ERC-3643 cAAPL into confidential cAAPL.
    struct WrapResult {
        bytes32 mintedAmount;
        bytes32 accountBalanceAfter;
        bytes32 totalSupplyAfter;
        uint256 nonce;
        uint48 deadline;
    }

    /// @notice Result of unwrapping confidential cAAPL back into plaintext ERC-3643 cAAPL.
    struct UnwrapResult {
        bytes32 burnedAmount;
        bytes32 accountBalanceAfter;
        bytes32 totalSupplyAfter;
        uint256 plaintextAmount;
        uint256 nonce;
        uint48 deadline;
    }

    /// @notice Result of a confidential dividend distribution.
    struct DividendResult {
        bytes32[] holderBalancesAfter;
        bytes32 totalSupplyAfter;
        uint256 nonce;
        uint48 deadline;
    }

    /// @notice Verifies a Nox TEE proof for a confidential transfer.
    /// @dev Nox decrypts amount and current balance handles inside the TEE, checks sufficient balance,
    /// checks ERC-3643 identity/compliance predicates supplied by the wrapper, computes the new encrypted
    /// balance handles, binds the result to chain ID/token/from/to/nonce/deadline, and signs the transition.
    /// @param token The confidential token contract.
    /// @param operator The caller initiating the transfer.
    /// @param from The debited holder.
    /// @param to The credited holder.
    /// @param amount The encrypted requested amount pointer.
    /// @param fromBalanceBefore The current encrypted sender balance pointer.
    /// @param toBalanceBefore The current encrypted receiver balance pointer.
    /// @param totalSupplyBefore The current encrypted total supply pointer.
    /// @param data Implementation-specific Nox proof bytes.
    /// @return result The verified encrypted state transition.
    function verifyTransfer(
        address token,
        address operator,
        address from,
        address to,
        bytes32 amount,
        bytes32 fromBalanceBefore,
        bytes32 toBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (TransferResult memory result);

    /// @notice Verifies a Nox TEE proof for wrapping plaintext ERC-3643 cAAPL.
    /// @dev Nox encrypts the plaintext deposited amount into a confidential pointer and computes encrypted
    /// account/total-supply handles. The on-chain wrapper only stores handles, never plaintext confidential balances.
    /// @param token The confidential token contract.
    /// @param account The wrapping account.
    /// @param plaintextAmount The plaintext ERC-3643 amount deposited into the reversible wrapper.
    /// @param accountBalanceBefore The current encrypted account balance pointer.
    /// @param totalSupplyBefore The current encrypted total supply pointer.
    /// @param data Implementation-specific Nox proof bytes.
    /// @return result The verified encrypted wrap transition.
    function verifyWrap(
        address token,
        address account,
        uint256 plaintextAmount,
        bytes32 accountBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (WrapResult memory result);

    /// @notice Verifies a Nox TEE proof for unwrapping confidential cAAPL.
    /// @dev Nox decrypts the burn amount inside the TEE, checks sufficient encrypted balance, returns updated
    /// encrypted handles, and discloses only the plaintext amount needed to release standard ERC-3643 cAAPL.
    /// @param token The confidential token contract.
    /// @param account The unwrapping account.
    /// @param encryptedAmount The encrypted burn amount pointer.
    /// @param accountBalanceBefore The current encrypted account balance pointer.
    /// @param totalSupplyBefore The current encrypted total supply pointer.
    /// @param data Implementation-specific Nox proof bytes.
    /// @return result The verified encrypted unwrap transition.
    function verifyUnwrap(
        address token,
        address account,
        bytes32 encryptedAmount,
        bytes32 accountBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (UnwrapResult memory result);

    /// @notice Verifies a disclosure request for an encrypted balance pointer.
    /// @dev Nox checks that requester is the owner or an authorized auditor/regulator, decrypts inside the TEE,
    /// and returns the plaintext only to authorized callers. Production deployments should deliver plaintext
    /// through an encrypted user channel and keep on-chain disclosure optional.
    /// @param token The confidential token contract.
    /// @param owner The balance owner.
    /// @param requester The disclosure requester.
    /// @param balanceHandle The encrypted balance pointer.
    /// @param data Implementation-specific Nox authorization proof bytes.
    /// @return plaintextBalance The decrypted balance for authorized use.
    function decryptBalance(
        address token,
        address owner,
        address requester,
        bytes32 balanceHandle,
        bytes calldata data
    ) external view returns (uint256 plaintextBalance);

    /// @notice Privately checks whether a holder balance meets an encrypted threshold.
    /// @param token The confidential token contract.
    /// @param owner The holder being checked.
    /// @param requester The address requesting the access decision.
    /// @param balanceHandle The encrypted balance pointer.
    /// @param thresholdHandle The encrypted threshold pointer.
    /// @return allowed True when the private balance satisfies the threshold.
    function hasMinimumBalance(
        address token,
        address owner,
        address requester,
        bytes32 balanceHandle,
        bytes32 thresholdHandle
    ) external view returns (bool allowed);

    /// @notice Verifies a confidential dividend distribution and computes updated encrypted balances.
    /// @param token The confidential token contract.
    /// @param holders The dividend recipients.
    /// @param encryptedAmounts The encrypted dividend amount pointers for each recipient.
    /// @param holderBalanceHandles The current encrypted balance pointers for each recipient.
    /// @param totalSupplyBefore The current encrypted total supply pointer.
    /// @param data Implementation-specific Nox proof bytes.
    /// @return result The verified encrypted distribution transition.
    function verifyDividendDistribution(
        address token,
        address[] calldata holders,
        bytes32[] calldata encryptedAmounts,
        bytes32[] calldata holderBalanceHandles,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (DividendResult memory result);

    /// @notice Produces a portable collateral sufficiency proof without revealing the holder balance.
    /// @param token The confidential token contract.
    /// @param owner The holder whose collateral is checked.
    /// @param requester The proof requester.
    /// @param balanceHandle The encrypted balance pointer.
    /// @return proof TEE-authenticated proof bytes consumable by external protocols.
    function verifyCollateral(
        address token,
        address owner,
        address requester,
        bytes32 balanceHandle
    ) external view returns (bytes memory proof);
}

/// @notice Reversible ERC-20 wrapper that converts regulated ERC-3643 cAAPL into ERC-7984 confidential cAAPL.
contract ConfidentialCAAPLToken is IERC7984, IConfidentialStockTradeReceiver, ERC165, ReentrancyGuard {
    bytes4 public constant ERC7984_INTERFACE_ID = 0x4958f2a4;

    CAAPLToken public immutable underlying;
    INoxConfidentialExecutor public immutable nox;
    IIdentityRegistry public immutable identityRegistry;

    string private _name;
    string private _symbol;
    string private _contractURI;

    bytes32 private _confidentialTotalSupply;
    mapping(address => bytes32) private _encryptedBalances;
    mapping(address => mapping(address => uint48)) private _operatorUntil;
    mapping(uint256 => bool) public usedNoxNonce;
    uint256 public nextDividendDistributionId = 1;

    /// @notice Emitted when standard cAAPL is wrapped into confidential cAAPL.
    event Wrapped(address indexed account, uint256 plaintextAmount, bytes32 indexed encryptedAmount);

    /// @notice Emitted when confidential cAAPL is unwrapped into standard cAAPL.
    event Unwrapped(address indexed account, uint256 plaintextAmount, bytes32 indexed encryptedAmount);

    /// @notice Emitted when a cross-token confidential stock trade settles.
    event StockTradeSettled(
        bytes32 indexed tradeId,
        address indexed initiator,
        address indexed counterparty,
        address payToken,
        address receiveToken,
        bytes32 encryptedPayAmount,
        bytes32 encryptedReceiveAmount
    );

    /// @notice Emitted when a holder receives a confidential dividend. Plaintext amount is never logged.
    event DividendDistributed(uint256 indexed distributionId, address indexed holder, bytes32 indexed encryptedAmount);

    /// @notice Emitted when a collateral proof is requested. The proof bytes are returned, not logged.
    event CollateralVerified(address indexed user, bytes32 indexed balanceHandle);

    /// @notice Deploys the confidential cAAPL reversible wrapper.
    /// @param underlying_ The ERC-3643 cAAPL token held in wrapper custody.
    /// @param nox_ The Nox TEE verifier/executor contract.
    /// @param contractURI_ ERC-7572-style metadata URI.
    constructor(CAAPLToken underlying_, INoxConfidentialExecutor nox_, string memory contractURI_) {
        require(address(underlying_) != address(0), "zero underlying");
        require(address(nox_) != address(0), "zero nox");
        underlying = underlying_;
        nox = nox_;
        identityRegistry = underlying_.identityRegistry();
        _name = "Confidential Wrapped Apple Stock";
        _symbol = "ccAAPL";
        _contractURI = contractURI_;
    }

    /// @inheritdoc IERC7984
    function name() external view override returns (string memory tokenName) {
        return _name;
    }

    /// @inheritdoc IERC7984
    function symbol() external view override returns (string memory tokenSymbol) {
        return _symbol;
    }

    /// @inheritdoc IERC7984
    function decimals() external view override returns (uint8 tokenDecimals) {
        return underlying.decimals();
    }

    /// @inheritdoc IERC7984
    function contractURI() external view override returns (string memory uri) {
        return _contractURI;
    }

    /// @inheritdoc IERC7984
    function confidentialTotalSupply() external view override returns (bytes32 encryptedTotalSupply) {
        return _confidentialTotalSupply;
    }

    /// @inheritdoc IERC7984
    function confidentialBalanceOf(address account) public view override returns (bytes32 encryptedBalance) {
        return _encryptedBalances[account];
    }

    /// @notice Alias for users to fetch their encrypted balance handle.
    /// @param account The account to query.
    /// @return encryptedBalance The encrypted balance handle only decryptable by authorized Nox disclosure.
    function getEncryptedBalance(address account) external view returns (bytes32 encryptedBalance) {
        return _encryptedBalances[account];
    }

    /// @inheritdoc IERC7984
    function isOperator(address holder, address spender) public view override returns (bool authorized) {
        return holder == spender || _operatorUntil[holder][spender] >= block.timestamp;
    }

    /// @inheritdoc IERC7984
    function setOperator(address operator, uint48 until) external override {
        require(operator != address(0), "zero operator");
        _operatorUntil[msg.sender][operator] = until;
        emit OperatorSet(msg.sender, operator, until);
    }

    /// @notice Wraps standard ERC-3643 cAAPL into confidential ERC-7984 cAAPL.
    /// @dev Caller must approve this wrapper to transfer `plaintextAmount` of underlying cAAPL.
    /// @param plaintextAmount The public ERC-3643 amount deposited into wrapper custody.
    /// @param noxData Nox proof that binds the encrypted minted amount and balance transition.
    /// @return encryptedAmount The encrypted minted amount pointer.
    function wrap(uint256 plaintextAmount, bytes calldata noxData) external nonReentrant returns (bytes32 encryptedAmount) {
        require(plaintextAmount > 0, "zero amount");
        require(identityRegistry.isVerified(msg.sender), "not verified");

        INoxConfidentialExecutor.WrapResult memory result = nox.verifyWrap(
            address(this),
            msg.sender,
            plaintextAmount,
            _encryptedBalances[msg.sender],
            _confidentialTotalSupply,
            noxData
        );
        _useNoxNonce(result.nonce, result.deadline);

        _encryptedBalances[msg.sender] = result.accountBalanceAfter;
        _confidentialTotalSupply = result.totalSupplyAfter;
        encryptedAmount = result.mintedAmount;

        require(underlying.transferFrom(msg.sender, address(this), plaintextAmount), "deposit failed");

        emit ConfidentialTransfer(address(0), msg.sender, encryptedAmount);
        emit Wrapped(msg.sender, plaintextAmount, encryptedAmount);
    }

    /// @notice Unwraps confidential cAAPL back into standard ERC-3643 cAAPL.
    /// @param encryptedAmount The encrypted burn amount pointer.
    /// @param noxData Nox proof that authorizes burn and plaintext release amount.
    /// @return plaintextAmount The plaintext cAAPL amount released from custody.
    function unwrap(bytes32 encryptedAmount, bytes calldata noxData)
        external
        nonReentrant
        returns (uint256 plaintextAmount)
    {
        require(encryptedAmount != bytes32(0), "zero handle");

        INoxConfidentialExecutor.UnwrapResult memory result = nox.verifyUnwrap(
            address(this), msg.sender, encryptedAmount, _encryptedBalances[msg.sender], _confidentialTotalSupply, noxData
        );
        _useNoxNonce(result.nonce, result.deadline);

        _encryptedBalances[msg.sender] = result.accountBalanceAfter;
        _confidentialTotalSupply = result.totalSupplyAfter;
        plaintextAmount = result.plaintextAmount;

        require(underlying.transfer(msg.sender, plaintextAmount), "withdraw failed");

        emit ConfidentialTransfer(msg.sender, address(0), result.burnedAmount);
        emit Unwrapped(msg.sender, plaintextAmount, result.burnedAmount);
    }

    /// @notice Decrypts a balance through Nox for the owner or another Nox-authorized requester.
    /// @param owner The holder whose balance is being decrypted.
    /// @param noxData Nox authorization proof for disclosure.
    /// @return plaintextBalance The decrypted balance returned by the Nox verifier.
    function decryptBalance(address owner, bytes calldata noxData) external view returns (uint256 plaintextBalance) {
        return nox.decryptBalance(address(this), owner, msg.sender, _encryptedBalances[owner], noxData);
    }

    /// @notice Privately checks whether a user's confidential balance meets an encrypted threshold.
    /// @param user The holder whose balance is checked.
    /// @param encryptedThreshold The encrypted threshold handle encoded as uint256 for frontend compatibility.
    /// @return allowed True when Nox confirms the threshold is satisfied.
    function hasMinimumBalance(address user, uint256 encryptedThreshold) external view returns (bool allowed) {
        return nox.hasMinimumBalance(
            address(this), user, msg.sender, _encryptedBalances[user], bytes32(encryptedThreshold)
        );
    }

    /// @notice Returns a TEE-authenticated proof that a user has sufficient confidential collateral.
    /// @param user The holder whose confidential stock balance is being checked.
    /// @return proof Portable proof bytes for DeFi integrations.
    function verifyCollateral(address user) external returns (bytes memory proof) {
        proof = nox.verifyCollateral(address(this), user, msg.sender, _encryptedBalances[user]);
        emit CollateralVerified(user, _encryptedBalances[user]);
    }

    /// @notice Distributes confidential dividends to holders without emitting plaintext amounts.
    /// @param encryptedAmounts ABI-encoded bytes32 encrypted dividend amount handles, one per holder.
    /// @param holders Dividend recipients.
    /// @return distributionId The id assigned to this dividend distribution.
    function distributeDividend(bytes[] calldata encryptedAmounts, address[] calldata holders)
        external
        nonReentrant
        returns (uint256 distributionId)
    {
        require(holders.length == encryptedAmounts.length, "length mismatch");
        require(holders.length > 0, "empty distribution");

        bytes32[] memory amountHandles = new bytes32[](holders.length);
        bytes32[] memory balanceHandles = new bytes32[](holders.length);

        for (uint256 i = 0; i < holders.length; i++) {
            require(identityRegistry.isVerified(holders[i]), "holder not verified");
            require(encryptedAmounts[i].length == 32, "bad encrypted amount");
            amountHandles[i] = abi.decode(encryptedAmounts[i], (bytes32));
            require(amountHandles[i] != bytes32(0), "zero dividend handle");
            balanceHandles[i] = _encryptedBalances[holders[i]];
        }

        INoxConfidentialExecutor.DividendResult memory result =
            nox.verifyDividendDistribution(address(this), holders, amountHandles, balanceHandles, _confidentialTotalSupply, "");
        _useNoxNonce(result.nonce, result.deadline);
        require(result.holderBalancesAfter.length == holders.length, "bad dividend result");

        distributionId = nextDividendDistributionId++;
        _confidentialTotalSupply = result.totalSupplyAfter;

        for (uint256 i = 0; i < holders.length; i++) {
            _encryptedBalances[holders[i]] = result.holderBalancesAfter[i];
            emit DividendDistributed(distributionId, holders[i], amountHandles[i]);
            emit ConfidentialTransfer(address(0), holders[i], amountHandles[i]);
        }
    }

    /// @notice Atomically settles a confidential stock-for-stock trade with another confidential token.
    /// @param counterparty The verified investor receiving this token and paying the other token.
    /// @param receiveToken The confidential token the initiator receives.
    /// @param encryptedPayAmount The encrypted amount of this token paid by msg.sender.
    /// @param encryptedReceiveAmount The encrypted amount of receiveToken paid by counterparty.
    /// @param payNoxData Nox proof data for this token leg.
    /// @param receiveNoxData Nox proof data for the receiveToken leg.
    /// @return tradeId The deterministic id for the atomic settlement.
    function settleStockTrade(
        address counterparty,
        address receiveToken,
        bytes32 encryptedPayAmount,
        bytes32 encryptedReceiveAmount,
        bytes calldata payNoxData,
        bytes calldata receiveNoxData
    ) external nonReentrant returns (bytes32 tradeId) {
        require(receiveToken != address(0), "zero receive token");
        require(receiveToken != address(this), "same token");
        require(identityRegistry.isVerified(counterparty), "counterparty not verified");

        tradeId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                receiveToken,
                msg.sender,
                counterparty,
                encryptedPayAmount,
                encryptedReceiveAmount,
                block.number
            )
        );

        bytes32 actualPayAmount = _confidentialTransfer(
            msg.sender, msg.sender, counterparty, encryptedPayAmount, payNoxData
        );
        bytes32 actualReceiveAmount = IConfidentialStockTradeReceiver(receiveToken).settleIncomingStockTrade(
            address(this), counterparty, msg.sender, encryptedReceiveAmount, tradeId, receiveNoxData
        );

        emit StockTradeSettled(
            tradeId,
            msg.sender,
            counterparty,
            address(this),
            receiveToken,
            actualPayAmount,
            actualReceiveAmount
        );
    }

    /// @inheritdoc IConfidentialStockTradeReceiver
    function settleIncomingStockTrade(
        address operator,
        address from,
        address to,
        bytes32 amount,
        bytes32 tradeId,
        bytes calldata data
    ) external nonReentrant returns (bytes32 actualAmount) {
        require(operator != address(0), "zero operator");
        require(tradeId != bytes32(0), "zero trade id");
        require(isOperator(from, msg.sender), "trade token not operator");
        actualAmount = _confidentialTransfer(operator, from, to, amount, data);
    }

    /// @inheritdoc IERC7984
    function confidentialTransfer(address to, bytes32 amount) external override nonReentrant returns (bytes32 actualAmount) {
        return _confidentialTransfer(msg.sender, msg.sender, to, amount, new bytes(0));
    }

    /// @inheritdoc IERC7984
    function confidentialTransfer(address to, bytes32 amount, bytes calldata data)
        public
        override
        nonReentrant
        returns (bytes32 actualAmount)
    {
        return _confidentialTransfer(msg.sender, msg.sender, to, amount, data);
    }

    /// @inheritdoc IERC7984
    function confidentialTransferFrom(address from, address to, bytes32 amount)
        external
        override
        nonReentrant
        returns (bytes32 actualAmount)
    {
        require(isOperator(from, msg.sender), "not operator");
        return _confidentialTransfer(msg.sender, from, to, amount, new bytes(0));
    }

    /// @inheritdoc IERC7984
    function confidentialTransferFrom(address from, address to, bytes32 amount, bytes calldata data)
        public
        override
        nonReentrant
        returns (bytes32 actualAmount)
    {
        require(isOperator(from, msg.sender), "not operator");
        return _confidentialTransfer(msg.sender, from, to, amount, data);
    }

    /// @inheritdoc IERC7984
    function confidentialTransferAndCall(address to, bytes32 amount, bytes calldata callData)
        external
        override
        nonReentrant
        returns (bytes32 actualAmount)
    {
        actualAmount = _confidentialTransfer(msg.sender, msg.sender, to, amount, new bytes(0));
        _callReceiver(msg.sender, msg.sender, to, actualAmount, callData);
    }

    /// @inheritdoc IERC7984
    function confidentialTransferAndCall(address to, bytes32 amount, bytes calldata data, bytes calldata callData)
        public
        override
        nonReentrant
        returns (bytes32 actualAmount)
    {
        actualAmount = _confidentialTransfer(msg.sender, msg.sender, to, amount, data);
        _callReceiver(msg.sender, msg.sender, to, actualAmount, callData);
    }

    /// @inheritdoc IERC7984
    function confidentialTransferFromAndCall(address from, address to, bytes32 amount, bytes calldata callData)
        external
        override
        nonReentrant
        returns (bytes32 actualAmount)
    {
        require(isOperator(from, msg.sender), "not operator");
        actualAmount = _confidentialTransfer(msg.sender, from, to, amount, new bytes(0));
        _callReceiver(msg.sender, from, to, actualAmount, callData);
    }

    /// @inheritdoc IERC7984
    function confidentialTransferFromAndCall(
        address from,
        address to,
        bytes32 amount,
        bytes calldata data,
        bytes calldata callData
    ) public override nonReentrant returns (bytes32 actualAmount) {
        require(isOperator(from, msg.sender), "not operator");
        actualAmount = _confidentialTransfer(msg.sender, from, to, amount, data);
        _callReceiver(msg.sender, from, to, actualAmount, callData);
    }

    /// @notice Returns true for ERC-165 and the current ERC-7984 draft interface id.
    /// @param interfaceId The interface id being queried.
    /// @return supported True when supported.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool supported) {
        return interfaceId == ERC7984_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @notice Applies a Nox-verified confidential transfer state transition.
    /// @param operator The caller initiating the transfer.
    /// @param from The debited holder.
    /// @param to The credited holder.
    /// @param amount The encrypted requested amount pointer.
    /// @param data Nox proof and encrypted state transition data.
    /// @return actualAmount The encrypted actual transferred amount pointer.
    function _confidentialTransfer(address operator, address from, address to, bytes32 amount, bytes memory data)
        internal
        returns (bytes32 actualAmount)
    {
        require(to != address(0), "zero recipient");
        require(amount != bytes32(0), "zero handle");
        require(identityRegistry.isVerified(from), "from not verified");
        require(identityRegistry.isVerified(to), "to not verified");

        INoxConfidentialExecutor.TransferResult memory result = nox.verifyTransfer(
            address(this),
            operator,
            from,
            to,
            amount,
            _encryptedBalances[from],
            _encryptedBalances[to],
            _confidentialTotalSupply,
            data
        );
        _useNoxNonce(result.nonce, result.deadline);

        _encryptedBalances[from] = result.fromBalanceAfter;
        _encryptedBalances[to] = result.toBalanceAfter;
        _confidentialTotalSupply = result.totalSupplyAfter;
        actualAmount = result.actualAmount;

        emit ConfidentialTransfer(from, to, actualAmount);
    }

    /// @notice Calls an ERC-7984 receiver callback when the recipient is a contract.
    /// @param operator The transfer operator.
    /// @param from The debited holder.
    /// @param to The recipient.
    /// @param amount The encrypted actual amount pointer.
    /// @param callData Callback data.
    function _callReceiver(address operator, address from, address to, bytes32 amount, bytes calldata callData) internal {
        if (to.code.length == 0) {
            return;
        }

        bytes32 success = IERC7984Receiver(to).onConfidentialTransferReceived(operator, from, amount, callData);
        require(success != bytes32(0), "receiver rejected");
    }

    /// @notice Marks a Nox nonce as consumed after validating expiry.
    /// @param nonce The Nox transition nonce.
    /// @param deadline The proof expiry timestamp.
    function _useNoxNonce(uint256 nonce, uint48 deadline) internal {
        require(deadline >= block.timestamp, "nox proof expired");
        require(!usedNoxNonce[nonce], "nox nonce used");
        usedNoxNonce[nonce] = true;
    }
}
