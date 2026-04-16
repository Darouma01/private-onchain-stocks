// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Shared oracle metadata and safety checks for all protocol assets.
contract PriceFeedModule is Ownable {
    struct FeedConfig {
        address primaryFeed;
        address fallbackFeed;
        uint48 maxStaleness;
        uint16 maxDeviationBps;
        bool enabled;
    }

    mapping(address => FeedConfig) public feedOf;

    event FeedConfigured(
        address indexed asset,
        address indexed primaryFeed,
        address indexed fallbackFeed,
        uint48 maxStaleness,
        uint16 maxDeviationBps
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setFeed(
        address asset,
        address primaryFeed,
        address fallbackFeed,
        uint48 maxStaleness,
        uint16 maxDeviationBps
    ) external onlyOwner {
        require(asset != address(0), "zero asset");
        require(primaryFeed != address(0) || fallbackFeed != address(0), "missing feed");
        require(maxStaleness > 0, "zero staleness");
        require(maxDeviationBps <= 10_000, "bad deviation");

        feedOf[asset] = FeedConfig({
            primaryFeed: primaryFeed,
            fallbackFeed: fallbackFeed,
            maxStaleness: maxStaleness,
            maxDeviationBps: maxDeviationBps,
            enabled: true
        });

        emit FeedConfigured(asset, primaryFeed, fallbackFeed, maxStaleness, maxDeviationBps);
    }

    function priceFeed(address asset) external view returns (address) {
        return feedOf[asset].primaryFeed;
    }

    function hasUsableFeed(address asset) external view returns (bool) {
        FeedConfig memory config = feedOf[asset];
        return config.enabled && (config.primaryFeed != address(0) || config.fallbackFeed != address(0));
    }
}
