// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BaseConfidentialToken} from "./BaseConfidentialToken.sol";
import {BaseConfidentialWrapper} from "./BaseConfidentialWrapper.sol";
import {INoxExecutor} from "../interfaces/INoxExecutor.sol";

/// @notice Deploys ERC-7984-style confidential wrappers for factory-created assets.
contract ConfidentialWrapperFactory is Ownable, ReentrancyGuard {
    INoxExecutor public immutable nox;
    mapping(address => address) public wrapperOf;
    address[] private allWrappers;

    event WrapperDeployed(address indexed underlying, address indexed wrapper);

    constructor(address initialOwner, INoxExecutor nox_) Ownable(initialOwner) {
        require(address(nox_) != address(0), "zero nox");
        nox = nox_;
    }

    function wrapAsset(address underlying) public onlyOwner nonReentrant returns (address wrapper) {
        require(underlying != address(0), "zero underlying");
        require(wrapperOf[underlying] == address(0), "wrapper exists");

        BaseConfidentialWrapper deployed = new BaseConfidentialWrapper(BaseConfidentialToken(underlying), nox, owner());
        wrapper = address(deployed);
        wrapperOf[underlying] = wrapper;
        allWrappers.push(wrapper);

        emit WrapperDeployed(underlying, wrapper);
    }

    function batchWrapAssets(address[] calldata underlyings) external onlyOwner returns (address[] memory wrappers) {
        wrappers = new address[](underlyings.length);
        for (uint256 i = 0; i < underlyings.length; i++) {
            address existing = wrapperOf[underlyings[i]];
            wrappers[i] = existing == address(0) ? wrapAsset(underlyings[i]) : existing;
        }
    }

    function getAllWrappers() external view returns (address[] memory) {
        return allWrappers;
    }

    function wrapperCount() external view returns (uint256) {
        return allWrappers.length;
    }
}
