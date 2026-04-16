// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISharedIdentityRegistry} from "../interfaces/ISharedIdentityRegistry.sol";

/// @notice Shared KYC registry for the 61-asset factory system.
contract SharedIdentityRegistry is Ownable, ISharedIdentityRegistry {
    struct Identity {
        bool verified;
        uint16 country;
        bool accredited;
        bool lightKyc;
    }

    mapping(address => Identity) private identities;

    event IdentityUpdated(address indexed investor, bool verified, uint16 country, bool accredited, bool lightKyc);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setIdentity(address investor, bool verified, uint16 country, bool accredited, bool lightKyc)
        external
        onlyOwner
    {
        require(investor != address(0), "zero investor");
        identities[investor] = Identity({verified: verified, country: country, accredited: accredited, lightKyc: lightKyc});
        emit IdentityUpdated(investor, verified, country, accredited, lightKyc);
    }

    function isVerified(address investor) external view returns (bool) {
        return identities[investor].verified;
    }

    function investorCountry(address investor) external view returns (uint16) {
        return identities[investor].country;
    }

    function isAccredited(address investor) external view returns (bool) {
        return identities[investor].accredited;
    }

    function hasLightKyc(address investor) external view returns (bool) {
        return identities[investor].lightKyc || identities[investor].verified;
    }
}
