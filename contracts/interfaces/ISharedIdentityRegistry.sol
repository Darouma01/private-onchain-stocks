// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal shared identity interface used by multi-asset compliance checks.
interface ISharedIdentityRegistry {
    function isVerified(address investor) external view returns (bool);
    function investorCountry(address investor) external view returns (uint16);
}
