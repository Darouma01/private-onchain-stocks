// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {AssetTypes} from "../assets/AssetTypes.sol";

/// @notice Canonical registry mapping protocol asset symbols to deployed token addresses.
contract AssetRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    mapping(bytes32 => AssetTypes.AssetMetadata) private metadataBySymbol;
    mapping(bytes32 => address) private assetBySymbol;
    mapping(address => bytes32) private symbolByAsset;
    mapping(AssetTypes.AssetCategory => address[]) private assetsByCategory;
    address[] private allAssets;

    event AssetRegistered(
        string indexed symbol,
        address indexed token,
        AssetTypes.AssetCategory indexed category,
        string name,
        address priceFeed,
        bool requiresKYC
    );

    constructor(address admin) {
        require(admin != address(0), "zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function registerAsset(AssetTypes.AssetMetadata calldata metadata) external onlyRole(REGISTRAR_ROLE) {
        require(metadata.token != address(0), "zero token");
        bytes32 key = AssetTypes.symbolKey(metadata.symbol);
        require(assetBySymbol[key] == address(0), "symbol exists");
        require(symbolByAsset[metadata.token] == bytes32(0), "token exists");

        metadataBySymbol[key] = metadata;
        assetBySymbol[key] = metadata.token;
        symbolByAsset[metadata.token] = key;
        assetsByCategory[metadata.category].push(metadata.token);
        allAssets.push(metadata.token);

        emit AssetRegistered(
            metadata.symbol,
            metadata.token,
            metadata.category,
            metadata.name,
            metadata.priceFeed,
            metadata.requiresKYC
        );
    }

    function getAssetAddress(string calldata symbol) external view returns (address) {
        return assetBySymbol[AssetTypes.symbolKey(symbol)];
    }

    function getAssetMetadata(string calldata symbol) external view returns (AssetTypes.AssetMetadata memory) {
        return metadataBySymbol[AssetTypes.symbolKey(symbol)];
    }

    function getAssetsByCategory(AssetTypes.AssetCategory category) external view returns (address[] memory) {
        return assetsByCategory[category];
    }

    function getAllAssets() external view returns (address[] memory) {
        return allAssets;
    }

    function assetCount() external view returns (uint256) {
        return allAssets.length;
    }
}
