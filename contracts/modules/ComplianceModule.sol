// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AssetTypes} from "../assets/AssetTypes.sol";
import {ISharedIdentityRegistry} from "../interfaces/ISharedIdentityRegistry.sol";

/// @notice Shared category-aware compliance engine for all factory-deployed assets.
contract ComplianceModule is Ownable {
    struct AssetCompliance {
        AssetTypes.AssetCategory category;
        bool requiresKYC;
        uint256 maxHolders;
        bool registered;
    }

    ISharedIdentityRegistry public identityRegistry;
    mapping(address => AssetCompliance) public complianceOf;
    mapping(address => mapping(uint16 => bool)) public blockedCountryOf;
    mapping(address => mapping(address => bool)) public isHolder;
    mapping(address => uint256) public holderCount;
    mapping(address => bool) public authorizedAsset;
    mapping(address => bool) public assetConfigurer;

    event AssetComplianceConfigured(
        address indexed asset,
        AssetTypes.AssetCategory indexed category,
        bool requiresKYC,
        uint256 maxHolders
    );
    event IdentityRegistryUpdated(address indexed identityRegistry);
    event AssetConfigurerUpdated(address indexed account, bool allowed);
    event HolderSynced(address indexed asset, address indexed holder, bool active);

    modifier onlyAsset() {
        require(authorizedAsset[msg.sender], "not asset");
        _;
    }

    modifier onlyOwnerOrConfigurer() {
        require(owner() == msg.sender || assetConfigurer[msg.sender], "not configurer");
        _;
    }

    constructor(address initialOwner, ISharedIdentityRegistry initialIdentityRegistry) Ownable(initialOwner) {
        require(address(initialIdentityRegistry) != address(0), "zero identity registry");
        identityRegistry = initialIdentityRegistry;
        emit IdentityRegistryUpdated(address(initialIdentityRegistry));
    }

    function setIdentityRegistry(ISharedIdentityRegistry newIdentityRegistry) external onlyOwner {
        require(address(newIdentityRegistry) != address(0), "zero identity registry");
        identityRegistry = newIdentityRegistry;
        emit IdentityRegistryUpdated(address(newIdentityRegistry));
    }

    function setAssetConfigurer(address account, bool allowed) external onlyOwner {
        require(account != address(0), "zero account");
        assetConfigurer[account] = allowed;
        emit AssetConfigurerUpdated(account, allowed);
    }

    function configureAsset(address asset, AssetTypes.AssetConfig calldata config) external onlyOwnerOrConfigurer {
        require(asset != address(0), "zero asset");
        authorizedAsset[asset] = true;
        complianceOf[asset] = AssetCompliance({
            category: config.category,
            requiresKYC: config.requiresKYC,
            maxHolders: config.maxHolders,
            registered: true
        });

        for (uint256 i = 0; i < config.blockedCountries.length; i++) {
            blockedCountryOf[asset][config.blockedCountries[i]] = true;
        }

        emit AssetComplianceConfigured(asset, config.category, config.requiresKYC, config.maxHolders);
    }

    function canTransfer(address asset, address from, address to, uint256 amount) public view returns (bool) {
        AssetCompliance memory rule = complianceOf[asset];
        if (!rule.registered) return false;
        if (amount == 0) return false;

        if (to != address(0)) {
            if (rule.requiresKYC && !identityRegistry.isVerified(to)) return false;
            uint16 toCountry = identityRegistry.investorCountry(to);
            if (blockedCountryOf[asset][toCountry]) return false;

            if (!isHolder[asset][to] && rule.maxHolders != 0 && holderCount[asset] >= rule.maxHolders) {
                return false;
            }
        }

        if (from != address(0)) {
            if (rule.requiresKYC && !identityRegistry.isVerified(from)) return false;
            uint16 fromCountry = identityRegistry.investorCountry(from);
            if (blockedCountryOf[asset][fromCountry]) return false;
        }

        return true;
    }

    function syncTransfer(address from, address to, uint256 fromBalanceAfter, uint256 toBalanceAfter) external onlyAsset {
        if (from != address(0)) {
            _syncHolder(msg.sender, from, fromBalanceAfter);
        }
        if (to != address(0)) {
            _syncHolder(msg.sender, to, toBalanceAfter);
        }
    }

    function _syncHolder(address asset, address holder, uint256 balanceAfter) internal {
        bool active = balanceAfter > 0;
        if (isHolder[asset][holder] == active) return;

        isHolder[asset][holder] = active;
        if (active) {
            holderCount[asset] += 1;
        } else {
            holderCount[asset] -= 1;
        }

        emit HolderSynced(asset, holder, active);
    }
}
