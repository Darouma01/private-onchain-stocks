# Deployment Checklist

## Arbitrum Sepolia

- [ ] Deployer wallet funded with Arbitrum Sepolia ETH.
- [ ] `ARBITRUM_SEPOLIA_RPC_URL` configured.
- [ ] `PRIVATE_KEY` configured only in local/CI secret storage.
- [ ] `ARBISCAN_API_KEY` configured with Etherscan API V2 support.
- [ ] All 61 assets reviewed in `deploy/assets.config.ts`.
- [ ] Direct Chainlink feed addresses confirmed for assets that have Arbitrum Sepolia support.
- [ ] Fallback oracle configured for unsupported stock, commodity, and international feeds.
- [ ] Gas estimate generated before batch deployment.
- [ ] Identity registry storage deployed.
- [ ] Trusted issuers registry deployed.
- [ ] Identity registry deployed.
- [ ] Compliance module deployed.
- [ ] Price feed module deployed and connected to all 61 assets.
- [ ] Asset factory deployed.
- [ ] Confidential wrapper factory deployed.
- [ ] `batchDeployAssets()` completed for all 61 assets.
- [ ] Governance module deployed.
- [ ] Dividend module deployed.
- [ ] Collateral module deployed.
- [ ] All 61 assets deployed and verified.
- [ ] Asset registry contains all 61 symbols and addresses.
- [ ] Wrapper registry contains all 61 confidential wrappers.
- [ ] KYC registry initialized.
- [ ] Test wrap/unwrap for `cAAPL`.
- [ ] Test wrap/unwrap for `cBTC`.
- [ ] Test wrap/unwrap for `cGOLD`.
- [ ] Test wrap/unwrap for `cUSDC`.
- [ ] Test cross-asset trade `cAAPL -> cUSDC`.
- [ ] Test cross-crypto trade `cBTC -> cETH`.
- [ ] Test private payment utility.
- [ ] Test access-control utility.
- [ ] Test rewards/dividends utility.
- [ ] Test governance utility.
- [ ] Test collateral/borrowing utility.
- [ ] Frontend environment updated with registry, factory, and module addresses.
- [ ] Frontend deployed to Vercel production.
- [ ] All 61 assets visible on Markets page.
- [ ] Faucet link tested: `https://cdefi.iex.ec/`.

## Arbitrum One

- [ ] Mainnet RPC configured.
- [ ] Mainnet deployer funded.
- [ ] Legal/compliance approval recorded for stock and commodity categories.
- [ ] Mainnet oracle feeds confirmed.
- [ ] Arbiscan verification dry-run completed on testnet.
- [ ] Batch deployment run with resume file enabled.
- [ ] Production Vercel env updated.
- [ ] Post-deployment smoke tests completed.
