// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AssetTypes} from "../assets/AssetTypes.sol";
import {AssetRegistry} from "./AssetRegistry.sol";
import {BaseConfidentialToken} from "./BaseConfidentialToken.sol";
import {ComplianceModule} from "../modules/ComplianceModule.sol";

/// @notice Deploys and registers all base assets for the Private Onchain Stocks protocol.
contract AssetFactory is Ownable, ReentrancyGuard {
    AssetRegistry public immutable registry;
    ComplianceModule public immutable compliance;

    mapping(bytes32 => address) public assetBySymbol;
    address[] private allAssets;

    event AssetDeployed(string indexed symbol, address indexed token, AssetTypes.AssetCategory indexed category);

    constructor(address initialOwner, AssetRegistry registry_, ComplianceModule compliance_) Ownable(initialOwner) {
        require(address(registry_) != address(0), "zero registry");
        require(address(compliance_) != address(0), "zero compliance");
        registry = registry_;
        compliance = compliance_;
    }

    function deployAsset(AssetTypes.AssetConfig calldata config) public onlyOwner nonReentrant returns (address token) {
        token = _deployAsset(config);
    }

    function batchDeployAssets(AssetTypes.AssetConfig[] calldata configs)
        external
        onlyOwner
        nonReentrant
        returns (address[] memory deployed)
    {
        require(configs.length > 0, "empty configs");
        deployed = new address[](configs.length);
        for (uint256 i = 0; i < configs.length; i++) {
            deployed[i] = _deployAsset(configs[i]);
        }
    }

    function addNewAsset(AssetTypes.AssetConfig calldata config) external onlyOwner nonReentrant returns (address token) {
        token = _deployAsset(config);
    }

    function getAssetAddress(string calldata symbol) external view returns (address) {
        return assetBySymbol[AssetTypes.symbolKey(symbol)];
    }

    function getAllAssets() external view returns (address[] memory) {
        return allAssets;
    }

    function assetCount() external view returns (uint256) {
        return allAssets.length;
    }

    function _deployAsset(AssetTypes.AssetConfig calldata config) internal returns (address token) {
        require(bytes(config.name).length != 0, "empty name");
        require(bytes(config.symbol).length != 0, "empty symbol");

        bytes32 key = AssetTypes.symbolKey(config.symbol);
        require(assetBySymbol[key] == address(0), "symbol exists");

        BaseConfidentialToken asset = new BaseConfidentialToken(
            config.name,
            config.symbol,
            config.category,
            config.requiresKYC,
            config.priceFeed,
            compliance,
            owner()
        );
        token = address(asset);

        assetBySymbol[key] = token;
        allAssets.push(token);

        compliance.configureAsset(token, config);
        registry.registerAsset(
            AssetTypes.AssetMetadata({
                name: config.name,
                symbol: config.symbol,
                category: config.category,
                token: token,
                priceFeed: config.priceFeed,
                maxHolders: config.maxHolders,
                requiresKYC: config.requiresKYC
            })
        );

        emit AssetDeployed(config.symbol, token, config.category);
    }
}
