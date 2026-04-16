// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "../lib/forge-std/src/Test.sol";
import {AssetTypes} from "../contracts/assets/AssetTypes.sol";
import {AssetFactory} from "../contracts/core/AssetFactory.sol";
import {AssetRegistry} from "../contracts/core/AssetRegistry.sol";
import {BaseConfidentialToken} from "../contracts/core/BaseConfidentialToken.sol";
import {ComplianceModule} from "../contracts/modules/ComplianceModule.sol";
import {ISharedIdentityRegistry} from "../contracts/interfaces/ISharedIdentityRegistry.sol";

contract MockSharedIdentityRegistry is ISharedIdentityRegistry {
    mapping(address => bool) public verified;
    mapping(address => uint16) public countryOf;

    function setIdentity(address investor, bool verified_, uint16 country) external {
        verified[investor] = verified_;
        countryOf[investor] = country;
    }

    function isVerified(address investor) external view returns (bool) {
        return verified[investor];
    }

    function investorCountry(address investor) external view returns (uint16) {
        return countryOf[investor];
    }
}

contract AssetFactoryTest is Test {
    address internal owner = address(0xA11CE);
    address internal alice = address(0xA);
    address internal bob = address(0xB);
    address internal unverified = address(0xBAD);

    MockSharedIdentityRegistry internal identities;
    ComplianceModule internal compliance;
    AssetRegistry internal registry;
    AssetFactory internal factory;

    function setUp() public {
        vm.startPrank(owner);
        identities = new MockSharedIdentityRegistry();
        identities.setIdentity(alice, true, 840);
        identities.setIdentity(bob, true, 840);
        identities.setIdentity(unverified, false, 840);

        compliance = new ComplianceModule(owner, identities);
        registry = new AssetRegistry(owner);
        factory = new AssetFactory(owner, registry, compliance);

        registry.grantRole(registry.REGISTRAR_ROLE(), address(factory));
        compliance.setAssetConfigurer(address(factory), true);
        vm.stopPrank();
    }

    function testBatchDeploysAll61AssetsAndRegistersCategories() public {
        AssetTypes.AssetConfig[] memory configs = _assetConfigs();

        vm.prank(owner);
        address[] memory deployed = factory.batchDeployAssets(configs);

        assertEq(deployed.length, 61);
        assertEq(factory.assetCount(), 61);
        assertEq(registry.assetCount(), 61);
        assertEq(registry.getAssetAddress("cAAPL"), deployed[0]);
        assertEq(registry.getAssetAddress("cXAUT"), deployed[60]);
        assertEq(registry.getAssetsByCategory(AssetTypes.AssetCategory.STOCK_US).length, 20);
        assertEq(registry.getAssetsByCategory(AssetTypes.AssetCategory.STOCK_INTL).length, 15);
        assertEq(registry.getAssetsByCategory(AssetTypes.AssetCategory.CRYPTO).length, 10);
        assertEq(registry.getAssetsByCategory(AssetTypes.AssetCategory.COMMODITY).length, 10);
        assertEq(registry.getAssetsByCategory(AssetTypes.AssetCategory.STABLECOIN).length, 6);
    }

    function testRejectsDuplicateSymbol() public {
        AssetTypes.AssetConfig memory config = _config(
            "Confidential Apple Stock",
            "cAAPL",
            AssetTypes.AssetCategory.STOCK_US,
            true,
            2000,
            _sanctioned()
        );

        vm.startPrank(owner);
        factory.deployAsset(config);
        vm.expectRevert("symbol exists");
        factory.deployAsset(config);
        vm.stopPrank();
    }

    function testStockRequiresVerifiedInvestor() public {
        vm.prank(owner);
        address tokenAddress = factory.deployAsset(
            _config("Confidential Apple Stock", "cAAPL", AssetTypes.AssetCategory.STOCK_US, true, 2000, _sanctioned())
        );

        BaseConfidentialToken token = BaseConfidentialToken(tokenAddress);

        vm.prank(owner);
        token.mint(alice, 100 ether);

        vm.prank(alice);
        vm.expectRevert("transfer not allowed");
        token.transfer(unverified, 1 ether);

        vm.prank(alice);
        token.transfer(bob, 1 ether);

        assertEq(token.balanceOf(bob), 1 ether);
    }

    function testCryptoAllowsUnverifiedTransfers() public {
        vm.prank(owner);
        address tokenAddress =
            factory.deployAsset(_config("Confidential Bitcoin", "cBTC", AssetTypes.AssetCategory.CRYPTO, false, 0, new uint16[](0)));

        BaseConfidentialToken token = BaseConfidentialToken(tokenAddress);

        vm.prank(owner);
        token.mint(alice, 100 ether);

        vm.prank(alice);
        token.transfer(unverified, 10 ether);

        assertEq(token.balanceOf(unverified), 10 ether);
    }

    function testMaxHolderLimitIsEnforced() public {
        vm.prank(owner);
        address tokenAddress = factory.deployAsset(
            _config("Limited Test Stock", "cLIMIT", AssetTypes.AssetCategory.STOCK_US, true, 1, _sanctioned())
        );

        BaseConfidentialToken token = BaseConfidentialToken(tokenAddress);

        vm.prank(owner);
        token.mint(alice, 100 ether);

        vm.prank(alice);
        vm.expectRevert("transfer not allowed");
        token.transfer(bob, 1 ether);
    }

    function _assetConfigs() internal pure returns (AssetTypes.AssetConfig[] memory configs) {
        configs = new AssetTypes.AssetConfig[](61);
        string[20] memory us = [
            "cAAPL",
            "cTSLA",
            "cMSFT",
            "cGOOGL",
            "cAMZN",
            "cNVDA",
            "cMETA",
            "cBRK",
            "cJPM",
            "cV",
            "cJNJ",
            "cWMT",
            "cXOM",
            "cBAC",
            "cNFLX",
            "cDIS",
            "cPFE",
            "cKO",
            "cMCD",
            "cGS"
        ];
        string[15] memory intl = [
            "cSAP",
            "cASML",
            "cNVO",
            "cSHELL",
            "cHSBC",
            "cTOYOTA",
            "cSONY",
            "cSAMSUNG",
            "cALIBABA",
            "cTENCENT",
            "cNESTLE",
            "cLVMH",
            "cSIEMENS",
            "cRIOTINTO",
            "cRELIANCE"
        ];
        string[10] memory crypto = ["cBTC", "cETH", "cBNB", "cSOL", "cXRP", "cADA", "cAVAX", "cDOT", "cLINK", "cMATIC"];
        string[10] memory commodities =
            ["cGOLD", "cSILVER", "cOIL", "cBRENT", "cNATGAS", "cCOPPER", "cPLATINUM", "cWHEAT", "cCORN", "cCOFFEE"];
        string[6] memory stables = ["cUSDC", "cUSDT", "cDAI", "cEURC", "cGBPT", "cXAUT"];

        uint256 index;
        for (uint256 i = 0; i < us.length; i++) {
            configs[index++] = _config(us[i], us[i], AssetTypes.AssetCategory.STOCK_US, true, 2000, _sanctioned());
        }
        for (uint256 i = 0; i < intl.length; i++) {
            configs[index++] = _config(intl[i], intl[i], AssetTypes.AssetCategory.STOCK_INTL, true, 5000, _sanctioned());
        }
        for (uint256 i = 0; i < crypto.length; i++) {
            configs[index++] = _config(crypto[i], crypto[i], AssetTypes.AssetCategory.CRYPTO, false, 0, new uint16[](0));
        }
        for (uint256 i = 0; i < commodities.length; i++) {
            configs[index++] = _config(commodities[i], commodities[i], AssetTypes.AssetCategory.COMMODITY, true, 10000, new uint16[](0));
        }
        for (uint256 i = 0; i < stables.length; i++) {
            configs[index++] = _config(stables[i], stables[i], AssetTypes.AssetCategory.STABLECOIN, false, 0, new uint16[](0));
        }
    }

    function _config(
        string memory name,
        string memory symbol,
        AssetTypes.AssetCategory category,
        bool requiresKYC,
        uint256 maxHolders,
        uint16[] memory blockedCountries
    ) internal pure returns (AssetTypes.AssetConfig memory) {
        return AssetTypes.AssetConfig({
            name: name,
            symbol: symbol,
            category: category,
            priceFeed: address(0),
            maxHolders: maxHolders,
            blockedCountries: blockedCountries,
            requiresKYC: requiresKYC
        });
    }

    function _sanctioned() internal pure returns (uint16[] memory countries) {
        countries = new uint16[](5);
        countries[0] = 408;
        countries[1] = 364;
        countries[2] = 760;
        countries[3] = 192;
        countries[4] = 643;
    }
}
