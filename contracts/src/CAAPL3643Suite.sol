// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Minimal external claim issuer interface used by the identity registry.
interface IClaimIssuer {
    /// @notice Returns whether a claim is valid for an investor identity and claim topic.
    /// @param identity The investor identity contract or identity address.
    /// @param topic The claim topic being validated.
    /// @param signature The issuer signature over the claim payload.
    /// @param data The encoded claim payload.
    /// @return valid True when the claim is valid.
    function isClaimValid(address identity, uint256 topic, bytes calldata signature, bytes calldata data)
        external
        view
        returns (bool valid);
}

/// @notice Claim topics required by the ERC-3643 identity registry.
interface IClaimTopicsRegistry {
    /// @notice Emitted when a claim topic is added.
    event ClaimTopicAdded(uint256 indexed claimTopic);

    /// @notice Emitted when a claim topic is removed.
    event ClaimTopicRemoved(uint256 indexed claimTopic);

    /// @notice Adds a required claim topic.
    /// @param claimTopic The claim topic to add.
    function addClaimTopic(uint256 claimTopic) external;

    /// @notice Removes a required claim topic.
    /// @param claimTopic The claim topic to remove.
    function removeClaimTopic(uint256 claimTopic) external;

    /// @notice Returns all required claim topics.
    /// @return topics The required claim topics.
    function getClaimTopics() external view returns (uint256[] memory topics);
}

/// @notice Trusted claim issuers registry used by ERC-3643 identity checks.
interface ITrustedIssuersRegistry {
    /// @notice Emitted when a trusted issuer is added.
    event TrustedIssuerAdded(address indexed trustedIssuer, uint256[] claimTopics);

    /// @notice Emitted when a trusted issuer is removed.
    event TrustedIssuerRemoved(address indexed trustedIssuer);

    /// @notice Emitted when a trusted issuer's supported topics are updated.
    event ClaimTopicsUpdated(address indexed trustedIssuer, uint256[] claimTopics);

    /// @notice Adds a trusted claim issuer.
    /// @param trustedIssuer The issuer contract address.
    /// @param claimTopics The claim topics supported by the issuer.
    function addTrustedIssuer(address trustedIssuer, uint256[] calldata claimTopics) external;

    /// @notice Removes a trusted claim issuer.
    /// @param trustedIssuer The issuer contract address.
    function removeTrustedIssuer(address trustedIssuer) external;

    /// @notice Updates the topics supported by a trusted issuer.
    /// @param trustedIssuer The issuer contract address.
    /// @param claimTopics The claim topics supported by the issuer.
    function updateIssuerClaimTopics(address trustedIssuer, uint256[] calldata claimTopics) external;

    /// @notice Returns all trusted issuers.
    /// @return issuers The trusted issuer addresses.
    function getTrustedIssuers() external view returns (address[] memory issuers);

    /// @notice Returns whether an issuer is trusted.
    /// @param issuer The issuer to check.
    /// @return trusted True when the issuer is trusted.
    function isTrustedIssuer(address issuer) external view returns (bool trusted);

    /// @notice Returns whether a trusted issuer supports a topic.
    /// @param issuer The issuer to check.
    /// @param claimTopic The claim topic to check.
    /// @return supported True when the issuer supports the topic.
    function hasClaimTopic(address issuer, uint256 claimTopic) external view returns (bool supported);

    /// @notice Returns trusted issuers supporting a topic.
    /// @param claimTopic The claim topic to filter by.
    /// @return issuers The trusted issuers supporting the topic.
    function getTrustedIssuersForClaimTopic(uint256 claimTopic) external view returns (address[] memory issuers);
}

/// @notice Storage contract for investor identities, countries, and claim payloads.
interface IIdentityRegistryStorage {
    /// @notice Emitted when an identity registry is bound to this storage.
    event IdentityRegistryBound(address indexed identityRegistry);

    /// @notice Emitted when an identity registry is unbound from this storage.
    event IdentityRegistryUnbound(address indexed identityRegistry);

    /// @notice Emitted when an investor identity is stored.
    event IdentityStored(address indexed investor, address indexed identity);

    /// @notice Emitted when an investor identity is removed.
    event IdentityRemoved(address indexed investor, address indexed identity);

    /// @notice Emitted when an investor country is updated.
    event CountryUpdated(address indexed investor, uint16 country);

    /// @notice Emitted when a claim payload is stored.
    event ClaimStored(address indexed investor, uint256 indexed topic, address indexed issuer);

    /// @notice Emitted when a claim payload is removed.
    event ClaimRemoved(address indexed investor, uint256 indexed topic, address indexed issuer);

    /// @notice Stores an investor identity and country.
    /// @param investor The investor wallet address.
    /// @param identity The investor identity address.
    /// @param country The investor country code.
    function addIdentityToStorage(address investor, address identity, uint16 country) external;

    /// @notice Removes an investor identity.
    /// @param investor The investor wallet address.
    function removeIdentityFromStorage(address investor) external;

    /// @notice Updates an investor country.
    /// @param investor The investor wallet address.
    /// @param country The investor country code.
    function modifyStoredInvestorCountry(address investor, uint16 country) external;

    /// @notice Stores an issuer claim payload for an investor.
    /// @param investor The investor wallet address.
    /// @param topic The claim topic.
    /// @param issuer The trusted issuer address.
    /// @param signature The issuer signature.
    /// @param data The encoded claim payload.
    function storeClaim(address investor, uint256 topic, address issuer, bytes calldata signature, bytes calldata data)
        external;

    /// @notice Removes an issuer claim payload for an investor.
    /// @param investor The investor wallet address.
    /// @param topic The claim topic.
    /// @param issuer The trusted issuer address.
    function removeClaim(address investor, uint256 topic, address issuer) external;

    /// @notice Returns the identity of an investor.
    /// @param investor The investor wallet address.
    /// @return identity The stored identity address.
    function storedIdentity(address investor) external view returns (address identity);

    /// @notice Returns the country of an investor.
    /// @param investor The investor wallet address.
    /// @return country The stored country code.
    function storedInvestorCountry(address investor) external view returns (uint16 country);

    /// @notice Returns the stored claim payload.
    /// @param investor The investor wallet address.
    /// @param topic The claim topic.
    /// @param issuer The issuer address.
    /// @return exists True when the claim exists.
    /// @return signature The issuer signature.
    /// @return data The encoded claim payload.
    function storedClaim(address investor, uint256 topic, address issuer)
        external
        view
        returns (bool exists, bytes memory signature, bytes memory data);

    /// @notice Returns whether an address is an authorized identity registry.
    /// @param identityRegistry The registry to check.
    /// @return bound True when the registry is bound.
    function isIdentityRegistryBound(address identityRegistry) external view returns (bool bound);
}

/// @notice ERC-3643 identity registry interface.
interface IIdentityRegistry {
    /// @notice Emitted when an identity is registered.
    event IdentityRegistered(address indexed investor, address indexed identity);

    /// @notice Emitted when an identity is removed.
    event IdentityRemoved(address indexed investor, address indexed identity);

    /// @notice Emitted when an identity address is updated.
    event IdentityUpdated(address indexed oldIdentity, address indexed newIdentity);

    /// @notice Emitted when an investor country is updated.
    event CountryUpdated(address indexed investor, uint16 country);

    /// @notice Registers an investor identity.
    /// @param investor The investor wallet address.
    /// @param identity The investor identity address.
    /// @param country The investor country code.
    function registerIdentity(address investor, address identity, uint16 country) external;

    /// @notice Deletes an investor identity.
    /// @param investor The investor wallet address.
    function deleteIdentity(address investor) external;

    /// @notice Updates an investor identity.
    /// @param investor The investor wallet address.
    /// @param identity The new identity address.
    function updateIdentity(address investor, address identity) external;

    /// @notice Updates an investor country.
    /// @param investor The investor wallet address.
    /// @param country The new country code.
    function updateCountry(address investor, uint16 country) external;

    /// @notice Stores an investor claim.
    /// @param investor The investor wallet address.
    /// @param topic The claim topic.
    /// @param issuer The trusted issuer address.
    /// @param signature The issuer signature.
    /// @param data The encoded claim payload.
    function addClaim(address investor, uint256 topic, address issuer, bytes calldata signature, bytes calldata data)
        external;

    /// @notice Removes an investor claim.
    /// @param investor The investor wallet address.
    /// @param topic The claim topic.
    /// @param issuer The trusted issuer address.
    function removeClaim(address investor, uint256 topic, address issuer) external;

    /// @notice Returns whether an investor is verified for all required claim topics.
    /// @param investor The investor wallet address.
    /// @return verified True when the investor is verified.
    function isVerified(address investor) external view returns (bool verified);

    /// @notice Returns whether a transfer is allowed from an identity perspective.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @return allowed True when the identity registry allows the transfer.
    function canTransfer(address from, address to) external view returns (bool allowed);

    /// @notice Returns the investor identity.
    /// @param investor The investor wallet address.
    /// @return identity The identity address.
    function identity(address investor) external view returns (address identity);

    /// @notice Returns the investor country.
    /// @param investor The investor wallet address.
    /// @return country The investor country code.
    function investorCountry(address investor) external view returns (uint16 country);
}

/// @notice ERC-3643 compliance interface.
interface ICompliance {
    /// @notice Emitted when the token address is bound.
    event TokenBound(address indexed token);

    /// @notice Emitted when the token address is unbound.
    event TokenUnbound(address indexed token);

    /// @notice Returns whether a transfer is compliant.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @param amount The transfer amount.
    /// @return allowed True when the transfer is compliant.
    function canTransfer(address from, address to, uint256 amount) external view returns (bool allowed);

    /// @notice Updates compliance state after a transfer.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @param amount The transfer amount.
    function transferred(address from, address to, uint256 amount) external;

    /// @notice Updates compliance state after token creation.
    /// @param to The recipient address.
    /// @param amount The minted amount.
    function created(address to, uint256 amount) external;

    /// @notice Updates compliance state after token destruction.
    /// @param from The holder address.
    /// @param amount The burned amount.
    function destroyed(address from, uint256 amount) external;
}

/// @notice ERC-3643 token interface with required regulated token operations.
interface IERC3643Token {
    /// @notice Emitted when the identity registry address is updated.
    event IdentityRegistryAdded(address indexed identityRegistry);

    /// @notice Emitted when the compliance contract address is updated.
    event ComplianceAdded(address indexed compliance);

    /// @notice Emitted when an agent is added.
    event AgentAdded(address indexed agent);

    /// @notice Emitted when an agent is removed.
    event AgentRemoved(address indexed agent);

    /// @notice Emitted when an address is frozen or unfrozen.
    event AddressFrozen(address indexed userAddress, bool indexed isFrozen, address indexed owner);

    /// @notice Emitted when tokens are partially frozen.
    event TokensFrozen(address indexed userAddress, uint256 amount);

    /// @notice Emitted when tokens are partially unfrozen.
    event TokensUnfrozen(address indexed userAddress, uint256 amount);

    /// @notice Emitted when a forced transfer is executed.
    event TransferForced(address indexed from, address indexed to, uint256 amount);

    /// @notice Emitted when a wallet recovery is executed.
    event RecoverySuccess(address indexed lostWallet, address indexed newWallet, address indexed investorIdentity);

    /// @notice Emitted when token metadata or onchain identity is updated.
    event UpdatedTokenInformation(string name, string symbol, uint8 decimals, string version, address indexed onchainID);

    /// @notice Sets the identity registry.
    /// @param identityRegistry The new identity registry address.
    function setIdentityRegistry(address identityRegistry) external;

    /// @notice Sets the compliance contract.
    /// @param compliance The new compliance contract address.
    function setCompliance(address compliance) external;

    /// @notice Updates the token name.
    /// @param name The new token name.
    function setName(string calldata name) external;

    /// @notice Updates the token symbol.
    /// @param symbol The new token symbol.
    function setSymbol(string calldata symbol) external;

    /// @notice Updates the token onchain identity.
    /// @param onchainID The new token identity address.
    function setOnchainID(address onchainID) external;

    /// @notice Adds an agent.
    /// @param agent The agent address.
    function addAgent(address agent) external;

    /// @notice Removes an agent.
    /// @param agent The agent address.
    function removeAgent(address agent) external;

    /// @notice Mints tokens to a verified investor.
    /// @param to The recipient address.
    /// @param amount The amount to mint.
    function mint(address to, uint256 amount) external;

    /// @notice Burns tokens from a holder.
    /// @param from The holder address.
    /// @param amount The amount to burn.
    function burn(address from, uint256 amount) external;

    /// @notice Freezes or unfreezes an address.
    /// @param userAddress The address to update.
    /// @param freeze True to freeze, false to unfreeze.
    function setAddressFrozen(address userAddress, bool freeze) external;

    /// @notice Freezes part of a holder balance.
    /// @param userAddress The holder address.
    /// @param amount The amount to freeze.
    function freezePartialTokens(address userAddress, uint256 amount) external;

    /// @notice Unfreezes part of a holder balance.
    /// @param userAddress The holder address.
    /// @param amount The amount to unfreeze.
    function unfreezePartialTokens(address userAddress, uint256 amount) external;

    /// @notice Executes an agent-forced transfer.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @param amount The amount to transfer.
    function forcedTransfer(address from, address to, uint256 amount) external;

    /// @notice Recovers a lost wallet into a replacement wallet.
    /// @param lostWallet The lost wallet address.
    /// @param newWallet The replacement wallet address.
    /// @param investorIdentity The investor identity address.
    function recoveryAddress(address lostWallet, address newWallet, address investorIdentity) external;

    /// @notice Transfers tokens to multiple recipients.
    /// @param recipients The recipient addresses.
    /// @param amounts The token amounts.
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external;

    /// @notice Executes forced transfers for multiple holder movements.
    /// @param fromList The sender addresses.
    /// @param toList The recipient addresses.
    /// @param amounts The token amounts.
    function batchForcedTransfer(address[] calldata fromList, address[] calldata toList, uint256[] calldata amounts)
        external;

    /// @notice Mints tokens to multiple recipients.
    /// @param recipients The recipient addresses.
    /// @param amounts The token amounts.
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external;

    /// @notice Burns tokens from multiple holders.
    /// @param holders The holder addresses.
    /// @param amounts The token amounts.
    function batchBurn(address[] calldata holders, uint256[] calldata amounts) external;

    /// @notice Freezes or unfreezes multiple addresses.
    /// @param userAddresses The addresses to update.
    /// @param freezes True values freeze and false values unfreeze.
    function batchSetAddressFrozen(address[] calldata userAddresses, bool[] calldata freezes) external;

    /// @notice Freezes partial token amounts for multiple holders.
    /// @param userAddresses The holder addresses.
    /// @param amounts The token amounts to freeze.
    function batchFreezePartialTokens(address[] calldata userAddresses, uint256[] calldata amounts) external;

    /// @notice Unfreezes partial token amounts for multiple holders.
    /// @param userAddresses The holder addresses.
    /// @param amounts The token amounts to unfreeze.
    function batchUnfreezePartialTokens(address[] calldata userAddresses, uint256[] calldata amounts) external;

    /// @notice Returns whether an address is frozen.
    /// @param userAddress The address to check.
    /// @return frozen True when frozen.
    function isFrozen(address userAddress) external view returns (bool frozen);

    /// @notice Returns the frozen token amount for a holder.
    /// @param userAddress The holder address.
    /// @return amount The frozen token amount.
    function getFrozenTokens(address userAddress) external view returns (uint256 amount);
}

/// @notice Registry of required claim topics for cAAPL investor verification.
contract CAAPLClaimTopicsRegistry is IClaimTopicsRegistry, Ownable {
    uint256[] private _claimTopics;
    mapping(uint256 => bool) private _exists;

    /// @notice Deploys the claim topics registry.
    /// @param initialOwner The initial owner.
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @inheritdoc IClaimTopicsRegistry
    function addClaimTopic(uint256 claimTopic) external override onlyOwner {
        require(!_exists[claimTopic], "topic exists");
        _exists[claimTopic] = true;
        _claimTopics.push(claimTopic);
        emit ClaimTopicAdded(claimTopic);
    }

    /// @inheritdoc IClaimTopicsRegistry
    function removeClaimTopic(uint256 claimTopic) external override onlyOwner {
        require(_exists[claimTopic], "topic missing");
        _exists[claimTopic] = false;

        uint256 length = _claimTopics.length;
        for (uint256 i = 0; i < length; i++) {
            if (_claimTopics[i] == claimTopic) {
                _claimTopics[i] = _claimTopics[length - 1];
                _claimTopics.pop();
                break;
            }
        }

        emit ClaimTopicRemoved(claimTopic);
    }

    /// @inheritdoc IClaimTopicsRegistry
    function getClaimTopics() external view override returns (uint256[] memory topics) {
        return _claimTopics;
    }
}

/// @notice Registry of issuers trusted to attest KYC, AML, sanctions, and jurisdiction claims.
contract CAAPLTrustedIssuersRegistry is ITrustedIssuersRegistry, Ownable {
    address[] private _trustedIssuers;
    mapping(address => bool) private _isTrustedIssuer;
    mapping(address => uint256[]) private _issuerTopics;
    mapping(address => mapping(uint256 => bool)) private _issuerHasTopic;

    /// @notice Deploys the trusted issuers registry.
    /// @param initialOwner The initial owner.
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @inheritdoc ITrustedIssuersRegistry
    function addTrustedIssuer(address trustedIssuer, uint256[] calldata claimTopics) external override onlyOwner {
        require(trustedIssuer != address(0), "zero issuer");
        require(!_isTrustedIssuer[trustedIssuer], "issuer exists");
        require(claimTopics.length > 0, "no topics");

        _isTrustedIssuer[trustedIssuer] = true;
        _trustedIssuers.push(trustedIssuer);
        _setIssuerClaimTopics(trustedIssuer, claimTopics);

        emit TrustedIssuerAdded(trustedIssuer, claimTopics);
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function removeTrustedIssuer(address trustedIssuer) external override onlyOwner {
        require(_isTrustedIssuer[trustedIssuer], "issuer missing");
        _isTrustedIssuer[trustedIssuer] = false;

        uint256[] storage topics = _issuerTopics[trustedIssuer];
        for (uint256 i = 0; i < topics.length; i++) {
            _issuerHasTopic[trustedIssuer][topics[i]] = false;
        }
        delete _issuerTopics[trustedIssuer];

        uint256 length = _trustedIssuers.length;
        for (uint256 i = 0; i < length; i++) {
            if (_trustedIssuers[i] == trustedIssuer) {
                _trustedIssuers[i] = _trustedIssuers[length - 1];
                _trustedIssuers.pop();
                break;
            }
        }

        emit TrustedIssuerRemoved(trustedIssuer);
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function updateIssuerClaimTopics(address trustedIssuer, uint256[] calldata claimTopics)
        external
        override
        onlyOwner
    {
        require(_isTrustedIssuer[trustedIssuer], "issuer missing");
        require(claimTopics.length > 0, "no topics");
        _setIssuerClaimTopics(trustedIssuer, claimTopics);
        emit ClaimTopicsUpdated(trustedIssuer, claimTopics);
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function getTrustedIssuers() external view override returns (address[] memory issuers) {
        return _trustedIssuers;
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function isTrustedIssuer(address issuer) external view override returns (bool trusted) {
        return _isTrustedIssuer[issuer];
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function hasClaimTopic(address issuer, uint256 claimTopic) external view override returns (bool supported) {
        return _isTrustedIssuer[issuer] && _issuerHasTopic[issuer][claimTopic];
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function getTrustedIssuersForClaimTopic(uint256 claimTopic)
        external
        view
        override
        returns (address[] memory issuers)
    {
        uint256 count;
        for (uint256 i = 0; i < _trustedIssuers.length; i++) {
            if (_issuerHasTopic[_trustedIssuers[i]][claimTopic]) {
                count++;
            }
        }

        issuers = new address[](count);
        uint256 index;
        for (uint256 i = 0; i < _trustedIssuers.length; i++) {
            if (_issuerHasTopic[_trustedIssuers[i]][claimTopic]) {
                issuers[index++] = _trustedIssuers[i];
            }
        }
    }

    /// @notice Replaces all supported claim topics for an issuer.
    /// @param trustedIssuer The issuer address.
    /// @param claimTopics The new supported claim topics.
    function _setIssuerClaimTopics(address trustedIssuer, uint256[] calldata claimTopics) internal {
        uint256[] storage oldTopics = _issuerTopics[trustedIssuer];
        for (uint256 i = 0; i < oldTopics.length; i++) {
            _issuerHasTopic[trustedIssuer][oldTopics[i]] = false;
        }
        delete _issuerTopics[trustedIssuer];

        for (uint256 i = 0; i < claimTopics.length; i++) {
            require(!_issuerHasTopic[trustedIssuer][claimTopics[i]], "duplicate topic");
            _issuerHasTopic[trustedIssuer][claimTopics[i]] = true;
            _issuerTopics[trustedIssuer].push(claimTopics[i]);
        }
    }
}

/// @notice Storage for cAAPL identity registry data.
contract CAAPLIdentityRegistryStorage is IIdentityRegistryStorage, Ownable {
    struct Claim {
        bool exists;
        bytes signature;
        bytes data;
    }

    mapping(address => address) private _identities;
    mapping(address => uint16) private _countries;
    mapping(address => bool) private _boundRegistries;
    mapping(address => mapping(uint256 => mapping(address => Claim))) private _claims;

    /// @notice Deploys identity registry storage.
    /// @param initialOwner The initial owner.
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Restricts writes to bound identity registries.
    modifier onlyBoundRegistry() {
        require(_boundRegistries[msg.sender], "registry not bound");
        _;
    }

    /// @notice Binds an identity registry to this storage.
    /// @param identityRegistry The registry to bind.
    function bindIdentityRegistry(address identityRegistry) external onlyOwner {
        require(identityRegistry != address(0), "zero registry");
        require(!_boundRegistries[identityRegistry], "already bound");
        _boundRegistries[identityRegistry] = true;
        emit IdentityRegistryBound(identityRegistry);
    }

    /// @notice Unbinds an identity registry from this storage.
    /// @param identityRegistry The registry to unbind.
    function unbindIdentityRegistry(address identityRegistry) external onlyOwner {
        require(_boundRegistries[identityRegistry], "not bound");
        _boundRegistries[identityRegistry] = false;
        emit IdentityRegistryUnbound(identityRegistry);
    }

    /// @inheritdoc IIdentityRegistryStorage
    function addIdentityToStorage(address investor, address identity, uint16 country)
        external
        override
        onlyBoundRegistry
    {
        require(investor != address(0), "zero investor");
        require(identity != address(0), "zero identity");
        require(_identities[investor] == address(0), "identity exists");
        _identities[investor] = identity;
        _countries[investor] = country;
        emit IdentityStored(investor, identity);
        emit CountryUpdated(investor, country);
    }

    /// @inheritdoc IIdentityRegistryStorage
    function removeIdentityFromStorage(address investor) external override onlyBoundRegistry {
        address identity = _identities[investor];
        require(identity != address(0), "identity missing");
        delete _identities[investor];
        delete _countries[investor];
        emit IdentityRemoved(investor, identity);
    }

    /// @inheritdoc IIdentityRegistryStorage
    function modifyStoredInvestorCountry(address investor, uint16 country) external override onlyBoundRegistry {
        require(_identities[investor] != address(0), "identity missing");
        _countries[investor] = country;
        emit CountryUpdated(investor, country);
    }

    /// @inheritdoc IIdentityRegistryStorage
    function storeClaim(address investor, uint256 topic, address issuer, bytes calldata signature, bytes calldata data)
        external
        override
        onlyBoundRegistry
    {
        require(_identities[investor] != address(0), "identity missing");
        require(issuer != address(0), "zero issuer");
        _claims[investor][topic][issuer] = Claim({exists: true, signature: signature, data: data});
        emit ClaimStored(investor, topic, issuer);
    }

    /// @inheritdoc IIdentityRegistryStorage
    function removeClaim(address investor, uint256 topic, address issuer) external override onlyBoundRegistry {
        require(_claims[investor][topic][issuer].exists, "claim missing");
        delete _claims[investor][topic][issuer];
        emit ClaimRemoved(investor, topic, issuer);
    }

    /// @inheritdoc IIdentityRegistryStorage
    function storedIdentity(address investor) external view override returns (address identity) {
        return _identities[investor];
    }

    /// @inheritdoc IIdentityRegistryStorage
    function storedInvestorCountry(address investor) external view override returns (uint16 country) {
        return _countries[investor];
    }

    /// @inheritdoc IIdentityRegistryStorage
    function storedClaim(address investor, uint256 topic, address issuer)
        external
        view
        override
        returns (bool exists, bytes memory signature, bytes memory data)
    {
        Claim storage claim = _claims[investor][topic][issuer];
        return (claim.exists, claim.signature, claim.data);
    }

    /// @inheritdoc IIdentityRegistryStorage
    function isIdentityRegistryBound(address identityRegistry) external view override returns (bool bound) {
        return _boundRegistries[identityRegistry];
    }
}

/// @notice Identity registry enforcing KYC, AML, sanctions, and jurisdiction claim validation.
contract CAAPLIdentityRegistry is IIdentityRegistry, AccessControl, Ownable {
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    ITrustedIssuersRegistry public trustedIssuersRegistry;
    IClaimTopicsRegistry public claimTopicsRegistry;
    IIdentityRegistryStorage public identityStorage;

    /// @notice Deploys the identity registry.
    /// @param initialOwner The initial owner.
    /// @param initialTrustedIssuersRegistry The trusted issuers registry.
    /// @param initialClaimTopicsRegistry The claim topics registry.
    /// @param initialIdentityStorage The identity registry storage.
    constructor(
        address initialOwner,
        ITrustedIssuersRegistry initialTrustedIssuersRegistry,
        IClaimTopicsRegistry initialClaimTopicsRegistry,
        IIdentityRegistryStorage initialIdentityStorage
    ) Ownable(initialOwner) {
        require(address(initialTrustedIssuersRegistry) != address(0), "zero issuers registry");
        require(address(initialClaimTopicsRegistry) != address(0), "zero topics registry");
        require(address(initialIdentityStorage) != address(0), "zero storage");
        trustedIssuersRegistry = initialTrustedIssuersRegistry;
        claimTopicsRegistry = initialClaimTopicsRegistry;
        identityStorage = initialIdentityStorage;
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(AGENT_ROLE, initialOwner);
    }

    /// @notice Restricts function access to identity agents.
    modifier onlyAgent() {
        require(hasRole(AGENT_ROLE, msg.sender), "not agent");
        _;
    }

    /// @notice Transfers ownership and default registry administration to a new owner.
    /// @param newOwner The new owner address.
    function transferOwnership(address newOwner) public override onlyOwner {
        address oldOwner = owner();
        super.transferOwnership(newOwner);
        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        _grantRole(AGENT_ROLE, newOwner);
        _revokeRole(AGENT_ROLE, oldOwner);
        _revokeRole(DEFAULT_ADMIN_ROLE, oldOwner);
    }

    /// @notice Updates the trusted issuers registry.
    /// @param newRegistry The new trusted issuers registry.
    function setTrustedIssuersRegistry(ITrustedIssuersRegistry newRegistry) external onlyOwner {
        require(address(newRegistry) != address(0), "zero registry");
        trustedIssuersRegistry = newRegistry;
    }

    /// @notice Updates the claim topics registry.
    /// @param newRegistry The new claim topics registry.
    function setClaimTopicsRegistry(IClaimTopicsRegistry newRegistry) external onlyOwner {
        require(address(newRegistry) != address(0), "zero registry");
        claimTopicsRegistry = newRegistry;
    }

    /// @notice Updates the identity registry storage.
    /// @param newStorage The new identity registry storage.
    function setIdentityRegistryStorage(IIdentityRegistryStorage newStorage) external onlyOwner {
        require(address(newStorage) != address(0), "zero storage");
        identityStorage = newStorage;
    }

    /// @inheritdoc IIdentityRegistry
    function registerIdentity(address investor, address identity_, uint16 country) external override onlyAgent {
        identityStorage.addIdentityToStorage(investor, identity_, country);
        emit IdentityRegistered(investor, identity_);
    }

    /// @inheritdoc IIdentityRegistry
    function deleteIdentity(address investor) external override onlyAgent {
        address oldIdentity = identityStorage.storedIdentity(investor);
        identityStorage.removeIdentityFromStorage(investor);
        emit IdentityRemoved(investor, oldIdentity);
    }

    /// @inheritdoc IIdentityRegistry
    function updateIdentity(address investor, address identity_) external override onlyAgent {
        address oldIdentity = identityStorage.storedIdentity(investor);
        require(oldIdentity != address(0), "identity missing");
        uint16 country = identityStorage.storedInvestorCountry(investor);
        identityStorage.removeIdentityFromStorage(investor);
        identityStorage.addIdentityToStorage(investor, identity_, country);
        emit IdentityUpdated(oldIdentity, identity_);
    }

    /// @inheritdoc IIdentityRegistry
    function updateCountry(address investor, uint16 country) external override onlyAgent {
        identityStorage.modifyStoredInvestorCountry(investor, country);
        emit CountryUpdated(investor, country);
    }

    /// @inheritdoc IIdentityRegistry
    function addClaim(address investor, uint256 topic, address issuer, bytes calldata signature, bytes calldata data)
        external
        override
        onlyAgent
    {
        require(trustedIssuersRegistry.hasClaimTopic(issuer, topic), "issuer/topic not trusted");
        identityStorage.storeClaim(investor, topic, issuer, signature, data);
    }

    /// @inheritdoc IIdentityRegistry
    function removeClaim(address investor, uint256 topic, address issuer) external override onlyAgent {
        identityStorage.removeClaim(investor, topic, issuer);
    }

    /// @inheritdoc IIdentityRegistry
    function isVerified(address investor) public view override returns (bool verified) {
        address identity_ = identityStorage.storedIdentity(investor);
        if (identity_ == address(0)) {
            return false;
        }

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        for (uint256 i = 0; i < topics.length; i++) {
            address[] memory issuers = trustedIssuersRegistry.getTrustedIssuersForClaimTopic(topics[i]);
            bool topicValid;

            for (uint256 j = 0; j < issuers.length; j++) {
                (bool exists, bytes memory signature, bytes memory data) =
                    identityStorage.storedClaim(investor, topics[i], issuers[j]);
                if (!exists) {
                    continue;
                }

                try IClaimIssuer(issuers[j]).isClaimValid(identity_, topics[i], signature, data) returns (bool valid) {
                    if (valid) {
                        topicValid = true;
                        break;
                    }
                } catch {
                    continue;
                }
            }

            if (!topicValid) {
                return false;
            }
        }

        return true;
    }

    /// @inheritdoc IIdentityRegistry
    function canTransfer(address from, address to) external view override returns (bool allowed) {
        bool fromAllowed = from == address(0) || isVerified(from);
        bool toAllowed = to == address(0) || isVerified(to);
        return fromAllowed && toAllowed;
    }

    /// @inheritdoc IIdentityRegistry
    function identity(address investor) external view override returns (address identity_) {
        return identityStorage.storedIdentity(investor);
    }

    /// @inheritdoc IIdentityRegistry
    function investorCountry(address investor) external view override returns (uint16 country) {
        return identityStorage.storedInvestorCountry(investor);
    }
}

/// @notice ERC-3643 compliance contract for cAAPL holder, balance, and jurisdiction limits.
contract CAAPLCompliance is ICompliance, Ownable {
    IIdentityRegistry public identityRegistry;
    address public token;
    uint256 public maxBalancePerInvestor;
    uint256 public maxHolders;
    uint256 public holderCount;

    mapping(uint16 => bool) public blockedCountry;
    mapping(address => bool) public isHolder;

    /// @notice Emitted when the identity registry is updated.
    event IdentityRegistrySet(address indexed identityRegistry);

    /// @notice Emitted when the maximum balance per investor is updated.
    event MaxBalancePerInvestorSet(uint256 maxBalancePerInvestor);

    /// @notice Emitted when the maximum holder count is updated.
    event MaxHoldersSet(uint256 maxHolders);

    /// @notice Emitted when a country restriction is updated.
    event CountryRestrictionSet(uint16 indexed country, bool blocked);

    /// @notice Deploys the compliance contract.
    /// @param initialOwner The initial owner.
    /// @param initialIdentityRegistry The identity registry.
    /// @param initialMaxBalancePerInvestor The maximum balance per investor.
    /// @param initialMaxHolders The maximum holder count.
    constructor(
        address initialOwner,
        IIdentityRegistry initialIdentityRegistry,
        uint256 initialMaxBalancePerInvestor,
        uint256 initialMaxHolders
    ) Ownable(initialOwner) {
        require(address(initialIdentityRegistry) != address(0), "zero identity registry");
        require(initialMaxBalancePerInvestor > 0, "zero max balance");
        require(initialMaxHolders > 0, "zero max holders");
        identityRegistry = initialIdentityRegistry;
        maxBalancePerInvestor = initialMaxBalancePerInvestor;
        maxHolders = initialMaxHolders;
        emit IdentityRegistrySet(address(initialIdentityRegistry));
        emit MaxBalancePerInvestorSet(initialMaxBalancePerInvestor);
        emit MaxHoldersSet(initialMaxHolders);
    }

    /// @notice Restricts calls to the bound token.
    modifier onlyToken() {
        require(msg.sender == token, "not token");
        _;
    }

    /// @notice Binds the cAAPL token to this compliance contract.
    /// @param token_ The token address.
    function bindToken(address token_) external onlyOwner {
        require(token_ != address(0), "zero token");
        require(token == address(0), "token already bound");
        token = token_;
        emit TokenBound(token_);
    }

    /// @notice Unbinds the current cAAPL token.
    function unbindToken() external onlyOwner {
        address oldToken = token;
        require(oldToken != address(0), "token not bound");
        token = address(0);
        emit TokenUnbound(oldToken);
    }

    /// @notice Updates the identity registry used for country checks.
    /// @param newIdentityRegistry The new identity registry.
    function setIdentityRegistry(IIdentityRegistry newIdentityRegistry) external onlyOwner {
        require(address(newIdentityRegistry) != address(0), "zero identity registry");
        identityRegistry = newIdentityRegistry;
        emit IdentityRegistrySet(address(newIdentityRegistry));
    }

    /// @notice Updates the maximum balance per investor.
    /// @param newMaxBalancePerInvestor The new maximum balance.
    function setMaxBalancePerInvestor(uint256 newMaxBalancePerInvestor) external onlyOwner {
        require(newMaxBalancePerInvestor > 0, "zero max balance");
        maxBalancePerInvestor = newMaxBalancePerInvestor;
        emit MaxBalancePerInvestorSet(newMaxBalancePerInvestor);
    }

    /// @notice Updates the maximum number of holders.
    /// @param newMaxHolders The new holder cap.
    function setMaxHolders(uint256 newMaxHolders) external onlyOwner {
        require(newMaxHolders > 0, "zero max holders");
        maxHolders = newMaxHolders;
        emit MaxHoldersSet(newMaxHolders);
    }

    /// @notice Blocks or unblocks a jurisdiction.
    /// @param country The country code.
    /// @param blocked True to block the country.
    function setCountryRestriction(uint16 country, bool blocked) external onlyOwner {
        blockedCountry[country] = blocked;
        emit CountryRestrictionSet(country, blocked);
    }

    /// @inheritdoc ICompliance
    function canTransfer(address from, address to, uint256 amount) public view override returns (bool allowed) {
        if (token == address(0)) {
            return false;
        }
        if (to != address(0)) {
            if (blockedCountry[identityRegistry.investorCountry(to)]) {
                return false;
            }

            uint256 toBalance = ERC20(token).balanceOf(to);
            if (toBalance + amount > maxBalancePerInvestor) {
                return false;
            }

            uint256 fromBalance = from == address(0) ? 0 : ERC20(token).balanceOf(from);
            bool senderStopsHolding = from != address(0) && from != to && isHolder[from] && fromBalance == amount;
            uint256 projectedHolderCount =
                toBalance == 0 && from != to && !isHolder[to] && !senderStopsHolding ? holderCount + 1 : holderCount;

            if (projectedHolderCount > maxHolders) {
                return false;
            }
        }
        return true;
    }

    /// @inheritdoc ICompliance
    function transferred(address from, address to, uint256 amount) external override onlyToken {
        amount;
        _syncHolder(from);
        _syncHolder(to);
    }

    /// @inheritdoc ICompliance
    function created(address to, uint256 amount) external override onlyToken {
        amount;
        _syncHolder(to);
    }

    /// @inheritdoc ICompliance
    function destroyed(address from, uint256 amount) external override onlyToken {
        amount;
        _syncHolder(from);
    }

    /// @notice Synchronizes holder-count accounting for an address.
    /// @param account The account to synchronize.
    function _syncHolder(address account) internal {
        if (account == address(0)) {
            return;
        }

        bool currentlyHolder = ERC20(token).balanceOf(account) > 0;
        bool previouslyHolder = isHolder[account];

        if (currentlyHolder && !previouslyHolder) {
            isHolder[account] = true;
            holderCount++;
        } else if (!currentlyHolder && previouslyHolder) {
            isHolder[account] = false;
            holderCount--;
        }
    }
}

/// @notice Fully permissioned ERC-3643 cAAPL token for confidential Apple stock representation.
contract CAAPLToken is IERC3643Token, ERC20, AccessControl, Ownable, Pausable, ReentrancyGuard {
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    string public constant TOKEN_VERSION = "4.0.0";

    IIdentityRegistry public identityRegistry;
    ICompliance public compliance;
    address public onchainID;

    string private _tokenName;
    string private _tokenSymbol;
    mapping(address => bool) private _frozen;
    mapping(address => uint256) private _frozenTokens;

    bool private _forcedTransferInProgress;
    bool private _tokenUpdateInProgress;

    /// @notice Deploys the cAAPL ERC-3643 token.
    /// @param initialOwner The owner address.
    /// @param initialIdentityRegistry The identity registry address.
    /// @param initialCompliance The compliance contract address.
    constructor(address initialOwner, IIdentityRegistry initialIdentityRegistry, ICompliance initialCompliance)
        ERC20("", "")
        Ownable(initialOwner)
    {
        require(address(initialIdentityRegistry) != address(0), "zero identity registry");
        require(address(initialCompliance) != address(0), "zero compliance");
        _tokenName = "Confidential Apple Stock";
        _tokenSymbol = "cAAPL";
        identityRegistry = initialIdentityRegistry;
        compliance = initialCompliance;
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(AGENT_ROLE, initialOwner);
        emit IdentityRegistryAdded(address(initialIdentityRegistry));
        emit ComplianceAdded(address(initialCompliance));
        emit UpdatedTokenInformation(_tokenName, _tokenSymbol, decimals(), TOKEN_VERSION, onchainID);
    }

    /// @notice Restricts function access to token agents.
    modifier onlyAgent() {
        require(hasRole(AGENT_ROLE, msg.sender), "not agent");
        _;
    }

    /// @notice Transfers ownership and token administration to a new owner.
    /// @param newOwner The new owner address.
    function transferOwnership(address newOwner) public override onlyOwner {
        address oldOwner = owner();
        super.transferOwnership(newOwner);
        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        _grantRole(AGENT_ROLE, newOwner);
        _revokeRole(AGENT_ROLE, oldOwner);
        _revokeRole(DEFAULT_ADMIN_ROLE, oldOwner);
    }

    /// @notice Returns the token name.
    /// @return tokenName The token name.
    function name() public view override returns (string memory tokenName) {
        return _tokenName;
    }

    /// @notice Returns the token symbol.
    /// @return tokenSymbol The token symbol.
    function symbol() public view override returns (string memory tokenSymbol) {
        return _tokenSymbol;
    }

    /// @notice Returns the token decimals.
    /// @return tokenDecimals The decimal count.
    function decimals() public pure override returns (uint8 tokenDecimals) {
        return 18;
    }

    /// @notice Returns the ERC-3643 implementation version.
    /// @return tokenVersion The implementation version string.
    function version() external pure returns (string memory tokenVersion) {
        return TOKEN_VERSION;
    }

    /// @notice Pauses all token transfers.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses token transfers.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @inheritdoc IERC3643Token
    function setIdentityRegistry(address identityRegistry_) external override onlyOwner {
        require(identityRegistry_ != address(0), "zero identity registry");
        identityRegistry = IIdentityRegistry(identityRegistry_);
        emit IdentityRegistryAdded(identityRegistry_);
    }

    /// @inheritdoc IERC3643Token
    function setCompliance(address compliance_) external override onlyOwner {
        require(compliance_ != address(0), "zero compliance");
        compliance = ICompliance(compliance_);
        emit ComplianceAdded(compliance_);
    }

    /// @inheritdoc IERC3643Token
    function setName(string calldata name_) external override onlyOwner {
        _tokenName = name_;
        emit UpdatedTokenInformation(_tokenName, _tokenSymbol, decimals(), TOKEN_VERSION, onchainID);
    }

    /// @inheritdoc IERC3643Token
    function setSymbol(string calldata symbol_) external override onlyOwner {
        _tokenSymbol = symbol_;
        emit UpdatedTokenInformation(_tokenName, _tokenSymbol, decimals(), TOKEN_VERSION, onchainID);
    }

    /// @inheritdoc IERC3643Token
    function setOnchainID(address onchainID_) external override onlyOwner {
        onchainID = onchainID_;
        emit UpdatedTokenInformation(_tokenName, _tokenSymbol, decimals(), TOKEN_VERSION, onchainID_);
    }

    /// @inheritdoc IERC3643Token
    function addAgent(address agent) external override onlyOwner {
        require(agent != address(0), "zero agent");
        _grantRole(AGENT_ROLE, agent);
        emit AgentAdded(agent);
    }

    /// @inheritdoc IERC3643Token
    function removeAgent(address agent) external override onlyOwner {
        _revokeRole(AGENT_ROLE, agent);
        emit AgentRemoved(agent);
    }

    /// @inheritdoc IERC3643Token
    function mint(address to, uint256 amount) external override onlyAgent nonReentrant {
        require(to != address(0), "zero recipient");
        _mint(to, amount);
    }

    /// @inheritdoc IERC3643Token
    function burn(address from, uint256 amount) external override onlyAgent nonReentrant {
        require(from != address(0), "zero holder");
        _burn(from, amount);
    }

    /// @inheritdoc IERC3643Token
    function setAddressFrozen(address userAddress, bool freeze) external override onlyAgent {
        require(userAddress != address(0), "zero address");
        _frozen[userAddress] = freeze;
        emit AddressFrozen(userAddress, freeze, msg.sender);
    }

    /// @inheritdoc IERC3643Token
    function freezePartialTokens(address userAddress, uint256 amount) external override onlyAgent {
        require(userAddress != address(0), "zero address");
        require(balanceOf(userAddress) >= _frozenTokens[userAddress] + amount, "freeze exceeds balance");
        _frozenTokens[userAddress] += amount;
        emit TokensFrozen(userAddress, amount);
    }

    /// @inheritdoc IERC3643Token
    function unfreezePartialTokens(address userAddress, uint256 amount) external override onlyAgent {
        require(userAddress != address(0), "zero address");
        require(_frozenTokens[userAddress] >= amount, "unfreeze exceeds frozen");
        _frozenTokens[userAddress] -= amount;
        emit TokensUnfrozen(userAddress, amount);
    }

    /// @inheritdoc IERC3643Token
    function forcedTransfer(address from, address to, uint256 amount) external override onlyAgent nonReentrant {
        _forcedTransfer(from, to, amount);
    }

    /// @inheritdoc IERC3643Token
    function recoveryAddress(address lostWallet, address newWallet, address investorIdentity)
        external
        override
        onlyAgent
        nonReentrant
    {
        require(lostWallet != address(0), "zero lost wallet");
        require(newWallet != address(0), "zero new wallet");
        require(investorIdentity != address(0), "zero identity");
        require(identityRegistry.identity(newWallet) == investorIdentity, "new wallet identity mismatch");
        require(identityRegistry.isVerified(newWallet), "new wallet not verified");

        uint256 balance = balanceOf(lostWallet);
        uint256 frozenAmount = _frozenTokens[lostWallet];

        if (balance > 0) {
            _forcedTransferInProgress = true;
            _transfer(lostWallet, newWallet, balance);
            _forcedTransferInProgress = false;
        }

        if (frozenAmount > 0) {
            _frozenTokens[lostWallet] = 0;
            _frozenTokens[newWallet] += frozenAmount;
            emit TokensUnfrozen(lostWallet, frozenAmount);
            emit TokensFrozen(newWallet, frozenAmount);
        }

        emit RecoverySuccess(lostWallet, newWallet, investorIdentity);
    }

    /// @inheritdoc IERC3643Token
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external override nonReentrant {
        require(recipients.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }

    /// @inheritdoc IERC3643Token
    function batchForcedTransfer(address[] calldata fromList, address[] calldata toList, uint256[] calldata amounts)
        external
        override
        onlyAgent
        nonReentrant
    {
        require(fromList.length == toList.length && toList.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < fromList.length; i++) {
            _forcedTransfer(fromList[i], toList[i], amounts[i]);
        }
    }

    /// @inheritdoc IERC3643Token
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external override onlyAgent nonReentrant {
        require(recipients.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "zero recipient");
            _mint(recipients[i], amounts[i]);
        }
    }

    /// @inheritdoc IERC3643Token
    function batchBurn(address[] calldata holders, uint256[] calldata amounts) external override onlyAgent nonReentrant {
        require(holders.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < holders.length; i++) {
            require(holders[i] != address(0), "zero holder");
            _burn(holders[i], amounts[i]);
        }
    }

    /// @inheritdoc IERC3643Token
    function batchSetAddressFrozen(address[] calldata userAddresses, bool[] calldata freezes)
        external
        override
        onlyAgent
    {
        require(userAddresses.length == freezes.length, "length mismatch");
        for (uint256 i = 0; i < userAddresses.length; i++) {
            require(userAddresses[i] != address(0), "zero address");
            _frozen[userAddresses[i]] = freezes[i];
            emit AddressFrozen(userAddresses[i], freezes[i], msg.sender);
        }
    }

    /// @inheritdoc IERC3643Token
    function batchFreezePartialTokens(address[] calldata userAddresses, uint256[] calldata amounts)
        external
        override
        onlyAgent
    {
        require(userAddresses.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < userAddresses.length; i++) {
            require(userAddresses[i] != address(0), "zero address");
            require(balanceOf(userAddresses[i]) >= _frozenTokens[userAddresses[i]] + amounts[i], "freeze exceeds balance");
            _frozenTokens[userAddresses[i]] += amounts[i];
            emit TokensFrozen(userAddresses[i], amounts[i]);
        }
    }

    /// @inheritdoc IERC3643Token
    function batchUnfreezePartialTokens(address[] calldata userAddresses, uint256[] calldata amounts)
        external
        override
        onlyAgent
    {
        require(userAddresses.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < userAddresses.length; i++) {
            require(userAddresses[i] != address(0), "zero address");
            require(_frozenTokens[userAddresses[i]] >= amounts[i], "unfreeze exceeds frozen");
            _frozenTokens[userAddresses[i]] -= amounts[i];
            emit TokensUnfrozen(userAddresses[i], amounts[i]);
        }
    }

    /// @inheritdoc IERC3643Token
    function isFrozen(address userAddress) external view override returns (bool frozen) {
        return _frozen[userAddress];
    }

    /// @inheritdoc IERC3643Token
    function getFrozenTokens(address userAddress) external view override returns (uint256 amount) {
        return _frozenTokens[userAddress];
    }

    /// @notice Returns whether a transfer would be valid under identity and compliance rules.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @param amount The transfer amount.
    /// @return allowed True when the transfer can execute.
    function canTransfer(address from, address to, uint256 amount) external view returns (bool allowed) {
        return _canTransfer(from, to, amount);
    }

    /// @notice Internal transfer/mint/burn hook enforcing ERC-3643 restrictions and updating compliance state.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @param amount The token amount.
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        require(!_tokenUpdateInProgress, "token reentrancy");
        require(_canTransfer(from, to, amount), "transfer not allowed");
        _tokenUpdateInProgress = true;
        super._update(from, to, amount);

        if (from == address(0)) {
            compliance.created(to, amount);
        } else if (to == address(0)) {
            compliance.destroyed(from, amount);
        } else {
            compliance.transferred(from, to, amount);
        }
        _tokenUpdateInProgress = false;
    }

    /// @notice Executes a forced transfer without entering the external nonReentrant wrapper.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @param amount The token amount.
    function _forcedTransfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "zero sender");
        require(to != address(0), "zero recipient");
        uint256 balance = balanceOf(from);
        require(balance >= amount, "amount exceeds balance");
        if (_frozenTokens[from] > balance - amount) {
            uint256 unfreezeAmount = _frozenTokens[from] - (balance - amount);
            _frozenTokens[from] -= unfreezeAmount;
            emit TokensUnfrozen(from, unfreezeAmount);
        }

        _forcedTransferInProgress = true;
        _transfer(from, to, amount);
        _forcedTransferInProgress = false;

        emit TransferForced(from, to, amount);
    }

    /// @notice Evaluates cAAPL identity, freeze, and compliance transfer rules.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @param amount The transfer amount.
    /// @return allowed True when the transfer is valid.
    function _canTransfer(address from, address to, uint256 amount) internal view returns (bool allowed) {
        if (from != address(0) && !_forcedTransferInProgress) {
            if (_frozen[from]) {
                return false;
            }
            if (balanceOf(from) < _frozenTokens[from] + amount) {
                return false;
            }
        }

        if (to != address(0) && !_forcedTransferInProgress && _frozen[to]) {
            return false;
        }

        if (!identityRegistry.canTransfer(from, to)) {
            return false;
        }

        if (!compliance.canTransfer(from, to, amount)) {
            return false;
        }

        return true;
    }
}
