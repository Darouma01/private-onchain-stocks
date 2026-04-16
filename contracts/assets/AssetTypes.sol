// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Shared asset metadata and category types for the 61-asset factory system.
library AssetTypes {
    enum AssetCategory {
        STOCK_US,
        STOCK_INTL,
        CRYPTO,
        COMMODITY,
        STABLECOIN
    }

    struct AssetConfig {
        string name;
        string symbol;
        AssetCategory category;
        address priceFeed;
        uint256 maxHolders;
        uint16[] blockedCountries;
        bool requiresKYC;
    }

    struct AssetMetadata {
        string name;
        string symbol;
        AssetCategory category;
        address token;
        address priceFeed;
        uint256 maxHolders;
        bool requiresKYC;
    }

    function symbolKey(string memory symbol) internal pure returns (bytes32) {
        return keccak256(bytes(symbol));
    }
}
