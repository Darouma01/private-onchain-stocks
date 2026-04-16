// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AssetTypes} from "../assets/AssetTypes.sol";
import {ComplianceModule} from "../modules/ComplianceModule.sol";

/// @notice Factory-deployed ERC-3643-style base token for any supported asset category.
contract BaseConfidentialToken is ERC20, AccessControl, Ownable, Pausable, ReentrancyGuard {
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    string public constant TOKEN_VERSION = "1.0.0";

    AssetTypes.AssetCategory public immutable category;
    bool public immutable requiresKYC;
    address public immutable priceFeed;
    ComplianceModule public immutable compliance;
    address public onchainID;

    string private tokenName;
    string private tokenSymbol;
    mapping(address => bool) private frozen;
    mapping(address => uint256) private frozenTokens;

    event AddressFrozen(address indexed userAddress, bool indexed isFrozen, address indexed agent);
    event TokensFrozen(address indexed userAddress, uint256 amount);
    event TokensUnfrozen(address indexed userAddress, uint256 amount);
    event TransferForced(address indexed from, address indexed to, uint256 amount);
    event UpdatedTokenInformation(string name, string symbol, uint8 decimals, string version, address indexed onchainID);

    constructor(
        string memory name_,
        string memory symbol_,
        AssetTypes.AssetCategory category_,
        bool requiresKYC_,
        address priceFeed_,
        ComplianceModule compliance_,
        address initialOwner
    ) ERC20("", "") Ownable(initialOwner) {
        require(bytes(name_).length != 0, "empty name");
        require(bytes(symbol_).length != 0, "empty symbol");
        require(address(compliance_) != address(0), "zero compliance");
        require(initialOwner != address(0), "zero owner");

        tokenName = name_;
        tokenSymbol = symbol_;
        category = category_;
        requiresKYC = requiresKYC_;
        priceFeed = priceFeed_;
        compliance = compliance_;

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(AGENT_ROLE, initialOwner);
        emit UpdatedTokenInformation(tokenName, tokenSymbol, decimals(), TOKEN_VERSION, onchainID);
    }

    modifier onlyAgent() {
        require(hasRole(AGENT_ROLE, msg.sender), "not agent");
        _;
    }

    function name() public view override returns (string memory) {
        return tokenName;
    }

    function symbol() public view override returns (string memory) {
        return tokenSymbol;
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setOnchainID(address onchainID_) external onlyOwner {
        onchainID = onchainID_;
        emit UpdatedTokenInformation(tokenName, tokenSymbol, decimals(), TOKEN_VERSION, onchainID_);
    }

    function addAgent(address agent) external onlyOwner {
        require(agent != address(0), "zero agent");
        _grantRole(AGENT_ROLE, agent);
    }

    function removeAgent(address agent) external onlyOwner {
        _revokeRole(AGENT_ROLE, agent);
    }

    function mint(address to, uint256 amount) external onlyAgent nonReentrant {
        require(to != address(0), "zero recipient");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyAgent nonReentrant {
        require(from != address(0), "zero holder");
        _burn(from, amount);
    }

    function setAddressFrozen(address userAddress, bool freeze) external onlyAgent {
        require(userAddress != address(0), "zero address");
        frozen[userAddress] = freeze;
        emit AddressFrozen(userAddress, freeze, msg.sender);
    }

    function freezePartialTokens(address userAddress, uint256 amount) external onlyAgent {
        require(balanceOf(userAddress) >= frozenTokens[userAddress] + amount, "freeze exceeds balance");
        frozenTokens[userAddress] += amount;
        emit TokensFrozen(userAddress, amount);
    }

    function unfreezePartialTokens(address userAddress, uint256 amount) external onlyAgent {
        require(frozenTokens[userAddress] >= amount, "unfreeze exceeds frozen");
        frozenTokens[userAddress] -= amount;
        emit TokensUnfrozen(userAddress, amount);
    }

    function forcedTransfer(address from, address to, uint256 amount) external onlyAgent nonReentrant {
        require(from != address(0), "zero sender");
        require(to != address(0), "zero recipient");
        uint256 balance = balanceOf(from);
        require(balance >= amount, "amount exceeds balance");
        if (frozenTokens[from] > balance - amount) {
            uint256 unfreezeAmount = frozenTokens[from] - (balance - amount);
            frozenTokens[from] -= unfreezeAmount;
            emit TokensUnfrozen(from, unfreezeAmount);
        }
        _transfer(from, to, amount);
        emit TransferForced(from, to, amount);
    }

    function isFrozen(address userAddress) external view returns (bool) {
        return frozen[userAddress];
    }

    function getFrozenTokens(address userAddress) external view returns (uint256) {
        return frozenTokens[userAddress];
    }

    function canTransfer(address from, address to, uint256 amount) public view returns (bool) {
        if (from != address(0)) {
            if (frozen[from]) return false;
            if (balanceOf(from) < frozenTokens[from] + amount) return false;
        }
        if (to != address(0) && frozen[to]) return false;
        return compliance.canTransfer(address(this), from, to, amount);
    }

    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        require(canTransfer(from, to, amount), "transfer not allowed");
        super._update(from, to, amount);
        compliance.syncTransfer(from, to, from == address(0) ? 0 : balanceOf(from), to == address(0) ? 0 : balanceOf(to));
    }
}
