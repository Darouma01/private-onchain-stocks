// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "../lib/forge-std/src/Test.sol";
import {AssetTypes} from "../contracts/assets/AssetTypes.sol";
import {AssetFactory} from "../contracts/core/AssetFactory.sol";
import {AssetRegistry} from "../contracts/core/AssetRegistry.sol";
import {BaseConfidentialToken} from "../contracts/core/BaseConfidentialToken.sol";
import {BaseConfidentialWrapper} from "../contracts/core/BaseConfidentialWrapper.sol";
import {ConfidentialWrapperFactory} from "../contracts/core/ConfidentialWrapperFactory.sol";
import {ComplianceModule} from "../contracts/modules/ComplianceModule.sol";
import {DemoNoxExecutor} from "../contracts/modules/DemoNoxExecutor.sol";
import {SharedIdentityRegistry} from "../contracts/core/IdentityRegistry.sol";

contract ConfidentialWrapperFactoryTest is Test {
    address internal owner = address(0xA11CE);
    address internal alice = address(0xA);
    address internal bob = address(0xB);

    SharedIdentityRegistry internal identities;
    ComplianceModule internal compliance;
    AssetRegistry internal registry;
    AssetFactory internal assetFactory;
    DemoNoxExecutor internal nox;
    ConfidentialWrapperFactory internal wrapperFactory;

    BaseConfidentialToken internal cAAPL;
    BaseConfidentialToken internal cUSDC;
    BaseConfidentialWrapper internal wAAPL;
    BaseConfidentialWrapper internal wUSDC;

    function setUp() public {
        vm.startPrank(owner);
        identities = new SharedIdentityRegistry(owner);
        identities.setIdentity(alice, true, 840, true, true);
        identities.setIdentity(bob, true, 840, true, true);

        compliance = new ComplianceModule(owner, identities);
        registry = new AssetRegistry(owner);
        assetFactory = new AssetFactory(owner, registry, compliance);
        registry.grantRole(registry.REGISTRAR_ROLE(), address(assetFactory));
        compliance.setAssetConfigurer(address(assetFactory), true);

        address cAAPLAddress = assetFactory.deployAsset(
            _config("Confidential Apple Stock", "cAAPL", AssetTypes.AssetCategory.STOCK_US, true, 2000)
        );
        address cUSDCAddress = assetFactory.deployAsset(
            _config("Confidential USD Coin", "cUSDC", AssetTypes.AssetCategory.STABLECOIN, false, 0)
        );

        cAAPL = BaseConfidentialToken(cAAPLAddress);
        cUSDC = BaseConfidentialToken(cUSDCAddress);
        nox = new DemoNoxExecutor();
        wrapperFactory = new ConfidentialWrapperFactory(owner, nox);

        address[] memory underlyings = new address[](2);
        underlyings[0] = address(cAAPL);
        underlyings[1] = address(cUSDC);
        address[] memory wrappers = wrapperFactory.batchWrapAssets(underlyings);
        wAAPL = BaseConfidentialWrapper(wrappers[0]);
        wUSDC = BaseConfidentialWrapper(wrappers[1]);

        identities.setIdentity(address(wAAPL), true, 840, true, true);
        identities.setIdentity(address(wUSDC), true, 840, true, true);

        cAAPL.mint(alice, 100 ether);
        cUSDC.mint(alice, 1_000 ether);
        cUSDC.mint(bob, 1_000 ether);
        vm.stopPrank();

        vm.prank(alice);
        cAAPL.approve(address(wAAPL), type(uint256).max);
        vm.prank(alice);
        cUSDC.approve(address(wUSDC), type(uint256).max);
        vm.prank(bob);
        cUSDC.approve(address(wUSDC), type(uint256).max);
    }

    function testBatchWrapsAssets() public {
        assertEq(wrapperFactory.wrapperOf(address(cAAPL)), address(wAAPL));
        assertEq(wrapperFactory.wrapperOf(address(cUSDC)), address(wUSDC));
        assertEq(wrapperFactory.wrapperCount(), 2);
        assertEq(wAAPL.symbol(), "wcAAPL");
    }

    function testWrapTransferAccessAndCollateral() public {
        vm.prank(alice);
        wAAPL.wrap(80 ether, "");

        bytes32 transferHandle = nox.createHandle(15 ether);

        vm.prank(alice);
        vm.expectEmit(true, true, true, false);
        emit BaseConfidentialWrapper.ConfidentialTransfer(address(cAAPL), alice, bob);
        wAAPL.confidentialTransfer(bob, transferHandle, "");

        bytes32 thresholdHandle = nox.createHandle(10 ether);
        assertTrue(wAAPL.hasMinimumBalance(bob, uint256(thresholdHandle)));

        vm.prank(bob);
        bytes memory proof = wAAPL.verifyCollateral(bob);
        assertGt(proof.length, 0);
    }

    function testCrossAssetTradeSettlesTwoEncryptedLegs() public {
        vm.prank(alice);
        wAAPL.wrap(50 ether, "");
        vm.prank(bob);
        wUSDC.wrap(500 ether, "");

        vm.prank(bob);
        wUSDC.setOperator(address(wAAPL), uint48(block.timestamp + 1 hours));

        bytes32 aaplAmount = nox.createHandle(10 ether);
        bytes32 usdcAmount = nox.createHandle(200 ether);

        vm.prank(alice);
        wAAPL.settleAssetTrade(bob, address(wUSDC), aaplAmount, usdcAmount, "", "");

        vm.prank(bob);
        assertEq(wAAPL.decryptBalance(bob, ""), 10 ether);
        vm.prank(alice);
        assertEq(wUSDC.decryptBalance(alice, ""), 200 ether);
    }

    function testDividendsGovernanceAndPortfolioTier() public {
        vm.prank(alice);
        wAAPL.wrap(60 ether, "");

        address[] memory holders = new address[](1);
        holders[0] = alice;
        bytes[] memory dividends = new bytes[](1);
        dividends[0] = abi.encode(nox.createHandle(5 ether));

        vm.prank(owner);
        uint256 dividendId = wAAPL.distributeDividend(holders, dividends, "");
        assertEq(dividendId, 1);

        bytes32 thresholdHandle = nox.createHandle(50 ether);
        address[] memory wrappers = new address[](1);
        wrappers[0] = address(wAAPL);
        assertTrue(wAAPL.hasMinimumPortfolioValue(alice, abi.encode(thresholdHandle), wrappers));
        assertEq(wAAPL.getUserTier(alice, abi.encode(thresholdHandle), wrappers), 2);

        vm.prank(alice);
        uint256 proposalId = wAAPL.createProposal("Enable confidential Apple dividends", wrappers, block.timestamp + 1 days);

        vm.prank(alice);
        wAAPL.castConfidentialVote(proposalId, abi.encode(nox.createHandle(1)), abi.encode(nox.createHandle(65 ether)));

        vm.warp(block.timestamp + 2 days);
        wAAPL.finalizeProposal(proposalId);
        (,,, bool finalized) = wAAPL.getProposal(proposalId);
        assertTrue(finalized);
    }

    function _config(
        string memory name,
        string memory symbol,
        AssetTypes.AssetCategory category,
        bool requiresKYC,
        uint256 maxHolders
    ) internal pure returns (AssetTypes.AssetConfig memory) {
        return AssetTypes.AssetConfig({
            name: name,
            symbol: symbol,
            category: category,
            priceFeed: address(0),
            maxHolders: maxHolders,
            blockedCountries: new uint16[](0),
            requiresKYC: requiresKYC
        });
    }
}
