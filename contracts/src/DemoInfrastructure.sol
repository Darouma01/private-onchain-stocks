// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IClaimIssuer} from "./CAAPL3643Suite.sol";
import {INoxConfidentialExecutor} from "./ConfidentialCAAPLToken.sol";

/// @notice Demo claim issuer for Arbitrum Sepolia judge testing.
/// @dev This accepts claims registered by the deployment script. Replace with a real KYC/AML claim issuer for production.
contract DemoClaimIssuer is IClaimIssuer {
    mapping(address => mapping(uint256 => bool)) public validClaim;

    /// @notice Emitted when a demo claim is configured.
    event ClaimValiditySet(address indexed identity, uint256 indexed topic, bool valid);

    /// @notice Sets whether an identity has a valid demo claim for a topic.
    /// @param identity The investor identity address.
    /// @param topic The claim topic.
    /// @param valid True when the claim should validate.
    function setClaimValidity(address identity, uint256 topic, bool valid) external {
        validClaim[identity][topic] = valid;
        emit ClaimValiditySet(identity, topic, valid);
    }

    /// @inheritdoc IClaimIssuer
    function isClaimValid(address identity, uint256 topic, bytes calldata signature, bytes calldata data)
        external
        view
        override
        returns (bool)
    {
        signature;
        data;
        return validClaim[identity][topic];
    }
}

/// @notice Demo Nox executor for Arbitrum Sepolia judge testing.
/// @dev This contract stores plaintext values for demo handles. Replace with the real iExec Nox verifier before production.
contract DemoNoxConfidentialExecutor is INoxConfidentialExecutor {
    mapping(bytes32 => uint256) public valueOf;
    uint256 public nextNonce = 1;

    /// @notice Emitted when a demo encrypted handle is created.
    event HandleCreated(bytes32 indexed handle);

    /// @notice Creates a demo encrypted amount handle.
    /// @param value The plaintext value represented by the demo handle.
    /// @return handle The generated handle.
    function createHandle(uint256 value) external returns (bytes32 handle) {
        handle = _newHandle(value);
    }

    /// @inheritdoc INoxConfidentialExecutor
    function verifyTransfer(
        address token,
        address operator,
        address from,
        address to,
        bytes32 amount,
        bytes32 fromBalanceBefore,
        bytes32 toBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external override returns (TransferResult memory result) {
        token;
        operator;
        from;
        to;
        data;

        uint256 transferAmount = valueOf[amount];
        uint256 fromBalance = valueOf[fromBalanceBefore];
        uint256 toBalance = valueOf[toBalanceBefore];
        require(transferAmount > 0, "demo nox: zero amount");
        require(fromBalance >= transferAmount, "demo nox: insufficient balance");

        result.actualAmount = amount;
        result.fromBalanceAfter = _newHandle(fromBalance - transferAmount);
        result.toBalanceAfter = _newHandle(toBalance + transferAmount);
        result.totalSupplyAfter = totalSupplyBefore;
        result.nonce = nextNonce++;
        result.deadline = uint48(block.timestamp + 1 hours);
    }

    /// @inheritdoc INoxConfidentialExecutor
    function verifyWrap(
        address token,
        address account,
        uint256 plaintextAmount,
        bytes32 accountBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external override returns (WrapResult memory result) {
        token;
        account;
        data;

        uint256 accountBalance = valueOf[accountBalanceBefore];
        uint256 totalSupply = valueOf[totalSupplyBefore];
        require(plaintextAmount > 0, "demo nox: zero amount");

        result.mintedAmount = _newHandle(plaintextAmount);
        result.accountBalanceAfter = _newHandle(accountBalance + plaintextAmount);
        result.totalSupplyAfter = _newHandle(totalSupply + plaintextAmount);
        result.nonce = nextNonce++;
        result.deadline = uint48(block.timestamp + 1 hours);
    }

    /// @inheritdoc INoxConfidentialExecutor
    function verifyUnwrap(
        address token,
        address account,
        bytes32 encryptedAmount,
        bytes32 accountBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external override returns (UnwrapResult memory result) {
        token;
        account;
        data;

        uint256 burnAmount = valueOf[encryptedAmount];
        uint256 accountBalance = valueOf[accountBalanceBefore];
        uint256 totalSupply = valueOf[totalSupplyBefore];
        require(burnAmount > 0, "demo nox: zero amount");
        require(accountBalance >= burnAmount, "demo nox: insufficient balance");
        require(totalSupply >= burnAmount, "demo nox: insufficient supply");

        result.burnedAmount = encryptedAmount;
        result.accountBalanceAfter = _newHandle(accountBalance - burnAmount);
        result.totalSupplyAfter = _newHandle(totalSupply - burnAmount);
        result.plaintextAmount = burnAmount;
        result.nonce = nextNonce++;
        result.deadline = uint48(block.timestamp + 1 hours);
    }

    /// @inheritdoc INoxConfidentialExecutor
    function decryptBalance(
        address token,
        address owner,
        address requester,
        bytes32 balanceHandle,
        bytes calldata data
    ) external view override returns (uint256 plaintextBalance) {
        token;
        data;
        require(owner == requester, "demo nox: requester not owner");
        return valueOf[balanceHandle];
    }

    /// @notice Creates a new demo handle.
    /// @param value The plaintext value represented by the handle.
    /// @return handle The generated handle.
    function _newHandle(uint256 value) internal returns (bytes32 handle) {
        handle = keccak256(abi.encode(address(this), block.chainid, nextNonce, value, block.timestamp, gasleft()));
        valueOf[handle] = value;
        emit HandleCreated(handle);
    }
}
