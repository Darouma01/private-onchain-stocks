// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {INoxExecutor} from "../interfaces/INoxExecutor.sol";

/// @notice Local Nox-compatible adapter for testnet and demo flows.
/// @dev The production integration replaces this with iExec Nox verification. This demo executor stores handle values
/// so tests and the hosted app can exercise end-to-end confidential utility without emitting plaintext transfer amounts.
contract DemoNoxExecutor is INoxExecutor {
    mapping(bytes32 => uint256) public valueOf;
    uint256 public nextNonce = 1;

    event HandleCreated(bytes32 indexed handle);

    function createHandle(uint256 value) external returns (bytes32 handle) {
        handle = _newHandle(value);
    }

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
    ) external returns (TransferResult memory result) {
        token;
        operator;
        from;
        to;
        data;

        uint256 transferAmount = valueOf[amount];
        uint256 fromBalance = valueOf[fromBalanceBefore];
        uint256 toBalance = valueOf[toBalanceBefore];
        require(transferAmount > 0, "nox: zero amount");
        require(fromBalance >= transferAmount, "nox: insufficient balance");

        result.actualAmount = amount;
        result.fromBalanceAfter = _newHandle(fromBalance - transferAmount);
        result.toBalanceAfter = _newHandle(toBalance + transferAmount);
        result.totalSupplyAfter = totalSupplyBefore;
        result.nonce = nextNonce++;
        result.deadline = uint48(block.timestamp + 1 hours);
    }

    function verifyWrap(
        address token,
        address account,
        uint256 plaintextAmount,
        bytes32 accountBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (WrapResult memory result) {
        token;
        account;
        data;

        require(plaintextAmount > 0, "nox: zero amount");
        result.mintedAmount = _newHandle(plaintextAmount);
        result.accountBalanceAfter = _newHandle(valueOf[accountBalanceBefore] + plaintextAmount);
        result.totalSupplyAfter = _newHandle(valueOf[totalSupplyBefore] + plaintextAmount);
        result.nonce = nextNonce++;
        result.deadline = uint48(block.timestamp + 1 hours);
    }

    function verifyUnwrap(
        address token,
        address account,
        bytes32 encryptedAmount,
        bytes32 accountBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (UnwrapResult memory result) {
        token;
        account;
        data;

        uint256 burnAmount = valueOf[encryptedAmount];
        uint256 accountBalance = valueOf[accountBalanceBefore];
        uint256 totalSupply = valueOf[totalSupplyBefore];
        require(burnAmount > 0, "nox: zero amount");
        require(accountBalance >= burnAmount, "nox: insufficient balance");
        require(totalSupply >= burnAmount, "nox: insufficient supply");

        result.burnedAmount = encryptedAmount;
        result.accountBalanceAfter = _newHandle(accountBalance - burnAmount);
        result.totalSupplyAfter = _newHandle(totalSupply - burnAmount);
        result.plaintextAmount = burnAmount;
        result.nonce = nextNonce++;
        result.deadline = uint48(block.timestamp + 1 hours);
    }

    function decryptBalance(address token, address owner, address requester, bytes32 balanceHandle, bytes calldata data)
        external
        view
        returns (uint256 plaintextBalance)
    {
        token;
        data;
        require(owner == requester, "nox: requester not owner");
        return valueOf[balanceHandle];
    }

    function hasMinimumBalance(
        address token,
        address owner,
        address requester,
        bytes32 balanceHandle,
        bytes32 thresholdHandle
    ) external view returns (bool allowed) {
        token;
        owner;
        requester;
        return valueOf[balanceHandle] >= valueOf[thresholdHandle];
    }

    function verifyDividendDistribution(
        address token,
        address[] calldata holders,
        bytes32[] calldata encryptedAmounts,
        bytes32[] calldata holderBalanceHandles,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (DividendResult memory result) {
        token;
        data;
        require(holders.length == encryptedAmounts.length, "nox: amount length");
        require(holders.length == holderBalanceHandles.length, "nox: balance length");

        result.holderBalancesAfter = new bytes32[](holders.length);
        uint256 totalSupply = valueOf[totalSupplyBefore];
        for (uint256 i = 0; i < holders.length; i++) {
            holders[i];
            uint256 dividendAmount = valueOf[encryptedAmounts[i]];
            require(dividendAmount > 0, "nox: zero dividend");
            result.holderBalancesAfter[i] = _newHandle(valueOf[holderBalanceHandles[i]] + dividendAmount);
            totalSupply += dividendAmount;
        }

        result.totalSupplyAfter = _newHandle(totalSupply);
        result.nonce = nextNonce++;
        result.deadline = uint48(block.timestamp + 1 hours);
    }

    function verifyCollateral(address token, address owner, address requester, bytes32 balanceHandle)
        external
        view
        returns (bytes memory proof)
    {
        require(valueOf[balanceHandle] > 0, "nox: insufficient collateral");
        return abi.encode(block.chainid, token, owner, requester, balanceHandle, keccak256("COLLATERAL_SUFFICIENT"));
    }

    function verifyPortfolioValue(address[] calldata wrappers, address owner, bytes32 encryptedThreshold)
        external
        view
        returns (bool allowed, uint8 tier)
    {
        owner;
        uint256 total;
        for (uint256 i = 0; i < wrappers.length; i++) {
            bytes32 handle = IEncryptedBalanceReader(wrappers[i]).getEncryptedBalance(owner);
            total += valueOf[handle];
        }

        uint256 threshold = valueOf[encryptedThreshold];
        allowed = total >= threshold;
        if (total >= threshold * 5 && threshold != 0) {
            tier = 3;
        } else if (total >= threshold && threshold != 0) {
            tier = 2;
        } else if (total > 0) {
            tier = 1;
        }
    }

    function _newHandle(uint256 value) internal returns (bytes32 handle) {
        handle = keccak256(abi.encode(address(this), block.chainid, nextNonce, value, block.timestamp, gasleft()));
        valueOf[handle] = value;
        emit HandleCreated(handle);
    }
}

interface IEncryptedBalanceReader {
    function getEncryptedBalance(address account) external view returns (bytes32 encryptedBalance);
}
