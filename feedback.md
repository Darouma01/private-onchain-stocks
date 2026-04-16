# Build Feedback

## Current State

- The live demo is still the verified cAAPL prototype.
- The project direction is now a 61-asset confidential trading protocol.
- The first migration commit adds the 61-asset registry, technical specification, deployment checklist, and Hardhat-oriented deployment scaffold.

## Important Gap

`deploy/assets.config.ts` currently uses `ZERO_FEED` for price feeds. This is intentional until direct Arbitrum Sepolia Chainlink feed addresses are verified asset by asset. Assets without direct feeds must be connected through `PriceFeedModule` fallback oracle support before collateral, trading, and dividends are enabled.

## Next Engineering Step

Implement `contracts/core/AssetRegistry.sol`, `contracts/core/AssetFactory.sol`, and `contracts/assets/AssetTypes.sol`, then replace the scaffolded `deployAsset` placeholder in `scripts/deploy-61-assets.ts` with the real factory call.
