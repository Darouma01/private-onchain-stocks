// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INoxExecutor {
    struct TransferResult {
        bytes32 actualAmount;
        bytes32 fromBalanceAfter;
        bytes32 toBalanceAfter;
        bytes32 totalSupplyAfter;
        uint256 nonce;
        uint48 deadline;
    }

    struct WrapResult {
        bytes32 mintedAmount;
        bytes32 accountBalanceAfter;
        bytes32 totalSupplyAfter;
        uint256 nonce;
        uint48 deadline;
    }

    struct UnwrapResult {
        bytes32 burnedAmount;
        bytes32 accountBalanceAfter;
        bytes32 totalSupplyAfter;
        uint256 plaintextAmount;
        uint256 nonce;
        uint48 deadline;
    }

    struct DividendResult {
        bytes32[] holderBalancesAfter;
        bytes32 totalSupplyAfter;
        uint256 nonce;
        uint48 deadline;
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
    ) external returns (TransferResult memory result);

    function verifyWrap(
        address token,
        address account,
        uint256 plaintextAmount,
        bytes32 accountBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (WrapResult memory result);

    function verifyUnwrap(
        address token,
        address account,
        bytes32 encryptedAmount,
        bytes32 accountBalanceBefore,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (UnwrapResult memory result);

    function decryptBalance(address token, address owner, address requester, bytes32 balanceHandle, bytes calldata data)
        external
        view
        returns (uint256 plaintextBalance);

    function hasMinimumBalance(
        address token,
        address owner,
        address requester,
        bytes32 balanceHandle,
        bytes32 thresholdHandle
    ) external view returns (bool allowed);

    function verifyDividendDistribution(
        address token,
        address[] calldata holders,
        bytes32[] calldata encryptedAmounts,
        bytes32[] calldata holderBalanceHandles,
        bytes32 totalSupplyBefore,
        bytes calldata data
    ) external returns (DividendResult memory result);

    function verifyCollateral(address token, address owner, address requester, bytes32 balanceHandle)
        external
        view
        returns (bytes memory proof);

    function verifyPortfolioValue(address[] calldata wrappers, address owner, bytes32 encryptedThreshold)
        external
        view
        returns (bool allowed, uint8 tier);
}
