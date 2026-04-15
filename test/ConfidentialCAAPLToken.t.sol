// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "../lib/forge-std/src/Test.sol";
import {
    CAAPLToken,
    CAAPLCompliance,
    CAAPLIdentityRegistry,
    CAAPLIdentityRegistryStorage,
    CAAPLTrustedIssuersRegistry,
    CAAPLClaimTopicsRegistry,
    IClaimIssuer
} from "../contracts/src/CAAPL3643Suite.sol";
import {
    ConfidentialCAAPLToken,
    INoxConfidentialExecutor,
    IERC7984Receiver
} from "../contracts/src/ConfidentialCAAPLToken.sol";

/// @notice Test claim issuer that accepts all claims for local ERC-3643 verification flows.
contract MockClaimIssuer is IClaimIssuer {
    /// @notice Returns true for every claim validation request.
    /// @param identity The investor identity address.
    /// @param topic The claim topic.
    /// @param signature The claim signature bytes.
    /// @param data The claim data bytes.
    /// @return valid Always true in this mock.
    function isClaimValid(address identity, uint256 topic, bytes calldata signature, bytes calldata data)
        external
        pure
        override
        returns (bool valid)
    {
        identity;
        topic;
        signature;
        data;
        return true;
    }
}

/// @notice Nox TEE test double that stores plaintext values only for test assertions.
contract MockNoxExecutor is INoxConfidentialExecutor {
    mapping(bytes32 => uint256) public valueOf;
    uint256 public nextNonce = 1;

    /// @notice Creates an encrypted amount pointer for tests.
    /// @param value The plaintext value represented by the pointer.
    /// @return handle The encrypted pointer handle.
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
        require(fromBalance >= transferAmount, "TEE: insufficient balance");

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
        require(accountBalance >= burnAmount, "TEE: insufficient balance");
        require(totalSupply >= burnAmount, "TEE: insufficient supply");

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
        require(owner == requester, "TEE: requester not owner");
        return valueOf[balanceHandle];
    }

    /// @notice Creates a fresh handle and associates it with a plaintext test value.
    /// @param value The plaintext value.
    /// @return handle The generated pointer.
    function _newHandle(uint256 value) internal returns (bytes32 handle) {
        handle = keccak256(abi.encode(address(this), block.chainid, nextNonce, value, gasleft()));
        valueOf[handle] = value;
    }
}

/// @notice Receiver used to test ERC-7984 callback composability.
contract MockConfidentialReceiver is IERC7984Receiver {
    bytes32 public constant TRUE_HANDLE = bytes32(uint256(1));
    address public lastOperator;
    address public lastFrom;
    bytes32 public lastAmount;
    bytes public lastData;

    /// @inheritdoc IERC7984Receiver
    function onConfidentialTransferReceived(address operator, address from, bytes32 amount, bytes calldata data)
        external
        override
        returns (bytes32 success)
    {
        lastOperator = operator;
        lastFrom = from;
        lastAmount = amount;
        lastData = data;
        return TRUE_HANDLE;
    }
}

/// @notice Tests for confidential wrapping, unwrapping, transfer, and Nox balance disclosure flows.
contract ConfidentialCAAPLTokenTest is Test {
    uint256 internal constant KYC_TOPIC = 1;
    address internal owner = address(0xA11CE);
    address internal alice = address(0xA);
    address internal bob = address(0xB);

    CAAPLToken internal caapl;
    ConfidentialCAAPLToken internal confidential;
    CAAPLCompliance internal compliance;
    CAAPLIdentityRegistry internal identities;
    MockNoxExecutor internal nox;

    /// @notice Deploys the ERC-3643 cAAPL stack and the ERC-7984 confidential wrapper.
    function setUp() public {
        vm.startPrank(owner);

        CAAPLClaimTopicsRegistry topics = new CAAPLClaimTopicsRegistry(owner);
        CAAPLTrustedIssuersRegistry issuers = new CAAPLTrustedIssuersRegistry(owner);
        CAAPLIdentityRegistryStorage storage_ = new CAAPLIdentityRegistryStorage(owner);
        MockClaimIssuer issuer = new MockClaimIssuer();

        topics.addClaimTopic(KYC_TOPIC);
        uint256[] memory issuerTopics = new uint256[](1);
        issuerTopics[0] = KYC_TOPIC;
        issuers.addTrustedIssuer(address(issuer), issuerTopics);

        identities = new CAAPLIdentityRegistry(owner, issuers, topics, storage_);
        storage_.bindIdentityRegistry(address(identities));

        compliance = new CAAPLCompliance(owner, identities, 1_000_000 ether, 100);
        caapl = new CAAPLToken(owner, identities, compliance);
        compliance.bindToken(address(caapl));

        nox = new MockNoxExecutor();
        confidential = new ConfidentialCAAPLToken(caapl, nox, "ipfs://confidential-caapl");

        caapl.addAgent(owner);
        identities.grantRole(identities.AGENT_ROLE(), owner);
        _verify(alice, address(0xA1), issuer);
        _verify(bob, address(0xB1), issuer);
        _verify(address(confidential), address(0xC1), issuer);

        caapl.mint(alice, 1_000 ether);

        vm.stopPrank();

        vm.prank(alice);
        caapl.approve(address(confidential), type(uint256).max);
    }

    /// @notice Verifies that wrapping deposits standard cAAPL and creates only encrypted balance handles.
    function testWrapDepositsUnderlyingAndCreatesEncryptedBalance() public {
        vm.prank(alice);
        bytes32 minted = confidential.wrap(100 ether, "");

        assertEq(caapl.balanceOf(alice), 900 ether);
        assertEq(caapl.balanceOf(address(confidential)), 100 ether);
        assertEq(nox.valueOf(minted), 100 ether);

        bytes32 encryptedBalance = confidential.getEncryptedBalance(alice);
        assertTrue(encryptedBalance != bytes32(0));
        assertEq(nox.valueOf(encryptedBalance), 100 ether);
    }

    /// @notice Verifies that unwrapping burns confidential cAAPL and releases standard cAAPL.
    function testUnwrapRedeemsUnderlying() public {
        vm.startPrank(alice);
        confidential.wrap(100 ether, "");
        bytes32 burnHandle = nox.createHandle(40 ether);

        uint256 released = confidential.unwrap(burnHandle, "");
        vm.stopPrank();

        assertEq(released, 40 ether);
        assertEq(caapl.balanceOf(alice), 940 ether);
        assertEq(caapl.balanceOf(address(confidential)), 60 ether);
        assertEq(nox.valueOf(confidential.getEncryptedBalance(alice)), 60 ether);
    }

    /// @notice Verifies that confidentialTransfer updates encrypted balance handles without exposing balances on-chain.
    function testConfidentialTransferUpdatesEncryptedBalances() public {
        vm.prank(alice);
        confidential.wrap(100 ether, "");

        bytes32 transferHandle = nox.createHandle(25 ether);

        vm.prank(alice);
        bytes32 actualAmount = confidential.confidentialTransfer(bob, transferHandle, "");

        assertEq(actualAmount, transferHandle);
        assertEq(nox.valueOf(confidential.getEncryptedBalance(alice)), 75 ether);
        assertEq(nox.valueOf(confidential.getEncryptedBalance(bob)), 25 ether);
    }

    /// @notice Verifies owner-only Nox decryption of an encrypted balance handle.
    function testDecryptBalanceOnlyForOwner() public {
        vm.prank(alice);
        confidential.wrap(100 ether, "");

        vm.prank(alice);
        assertEq(confidential.decryptBalance(alice, ""), 100 ether);

        vm.prank(bob);
        vm.expectRevert("TEE: requester not owner");
        confidential.decryptBalance(alice, "");
    }

    /// @notice Verifies ERC-7984 operator and callback flow for composable confidential receivers.
    function testConfidentialTransferFromAndCall() public {
        MockConfidentialReceiver receiver = new MockConfidentialReceiver();

        vm.startPrank(owner);
        MockClaimIssuer issuer = new MockClaimIssuer();
        _verify(address(receiver), address(0xCA11), issuer);
        vm.stopPrank();

        vm.prank(alice);
        confidential.wrap(100 ether, "");

        vm.prank(alice);
        confidential.setOperator(bob, uint48(block.timestamp + 1 hours));

        bytes32 transferHandle = nox.createHandle(10 ether);

        vm.prank(bob);
        bytes32 actualAmount =
            confidential.confidentialTransferFromAndCall(alice, address(receiver), transferHandle, "", "hello");

        assertEq(actualAmount, transferHandle);
        assertEq(receiver.lastOperator(), bob);
        assertEq(receiver.lastFrom(), alice);
        assertEq(receiver.lastAmount(), transferHandle);
        assertEq(receiver.lastData(), "hello");
        assertEq(nox.valueOf(confidential.getEncryptedBalance(alice)), 90 ether);
        assertEq(nox.valueOf(confidential.getEncryptedBalance(address(receiver))), 10 ether);
    }

    /// @notice Registers and claims an ERC-3643 investor identity in the test registry.
    /// @param wallet The wallet to verify.
    /// @param identity The identity address.
    /// @param issuer The trusted claim issuer.
    function _verify(address wallet, address identity, MockClaimIssuer issuer) internal {
        identities.registerIdentity(wallet, identity, 840);
        identities.addClaim(wallet, KYC_TOPIC, address(issuer), bytes("sig"), bytes("claim"));
    }
}
