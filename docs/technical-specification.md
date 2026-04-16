# Private Onchain Stocks Technical Specification

## 1. Product Scope

Private Onchain Stocks is a confidential multi-asset trading protocol for 61 tokenized real-world assets. It combines ERC-3643 compliance, ERC-7984-style confidential token behavior, and iExec Nox TEE verification so investors can hold, trade, govern, receive rewards, and borrow against assets without exposing balances or transaction amounts.

The protocol targets Arbitrum Sepolia first, then Arbitrum One.

## 2. Asset Registry

The protocol supports 61 assets across five categories:

- 20 US stocks: `cAAPL`, `cTSLA`, `cMSFT`, `cGOOGL`, `cAMZN`, `cNVDA`, `cMETA`, `cBRK`, `cJPM`, `cV`, `cJNJ`, `cWMT`, `cXOM`, `cBAC`, `cNFLX`, `cDIS`, `cPFE`, `cKO`, `cMCD`, `cGS`
- 15 international stocks: `cSAP`, `cASML`, `cNVO`, `cSHELL`, `cHSBC`, `cTOYOTA`, `cSONY`, `cSAMSUNG`, `cALIBABA`, `cTENCENT`, `cNESTLE`, `cLVMH`, `cSIEMENS`, `cRIOTINTO`, `cRELIANCE`
- 10 cryptocurrencies: `cBTC`, `cETH`, `cBNB`, `cSOL`, `cXRP`, `cADA`, `cAVAX`, `cDOT`, `cLINK`, `cMATIC`
- 10 commodities: `cGOLD`, `cSILVER`, `cOIL`, `cBRENT`, `cNATGAS`, `cCOPPER`, `cPLATINUM`, `cWHEAT`, `cCORN`, `cCOFFEE`
- 6 confidential stablecoins: `cUSDC`, `cUSDT`, `cDAI`, `cEURC`, `cGBPT`, `cXAUT`

The canonical TypeScript deployment config lives in `deploy/assets.config.ts`. Price feed fields are intentionally explicit. Any asset without a direct Arbitrum Sepolia Chainlink feed must use the `PriceFeedModule` fallback path before production deployment.

## 3. Smart Contract Architecture

```text
IdentityRegistryStorage
TrustedIssuersRegistry
IdentityRegistry
ComplianceModule
PriceFeedModule
AssetRegistry
AssetFactory
ConfidentialWrapperFactory
BaseConfidentialToken x 61
BaseConfidentialWrapper x 61
GovernanceModule
DividendModule
CollateralModule
NoxVerifier / NoxExecutor
```

### AssetFactory.sol

Deploys all 61 compliant base tokens from `AssetConfig[]`.

Responsibilities:

- Accept `AssetConfig` values containing name, symbol, category, price feed, max holders, blocked countries, and KYC flag.
- Deploy `BaseConfidentialToken` for each asset.
- Register each asset in `AssetRegistry`.
- Attach shared identity, compliance, and price modules.
- Support `deployAsset`, `batchDeployAssets`, and `addNewAsset`.
- Reject duplicate symbols.
- Emit `AssetDeployed(symbol, token, category)`.

### BaseConfidentialToken.sol

Shared ERC-3643-compatible base token for all assets.

Responsibilities:

- ERC-20 metadata and transfer behavior.
- Identity registry checks when `requiresKYC` is true.
- Category-aware compliance hooks.
- Agent/minter roles.
- Price feed pointer.
- Factory-only initialization or constructor setup.

### AssetRegistry.sol

Canonical on-chain registry for the 61 assets.

Responsibilities:

- `symbol => token`.
- `category => token[]`.
- Metadata storage.
- Duplicate-symbol protection.
- View helpers for frontend and deployment verification.

### ComplianceModule.sol

Shared policy engine.

Category rules:

- US stocks: KYC required, accredited investor flag, max 2000 non-accredited holders, sanctioned country blocklist.
- International stocks: KYC required, per-country rules, China/HK restrictions for `cALIBABA` and `cTENCENT`, FEMA flag for `cRELIANCE`.
- Crypto: no KYC, no country restrictions, unlimited holders.
- Commodities: light KYC, settlement preference in `cUSDC` or `cUSDT`.
- Stablecoins: no KYC, peg validation during mint.

### PriceFeedModule.sol

Shared oracle interface.

Responsibilities:

- Chainlink primary feed lookup.
- Backup oracle lookup for assets without direct feeds.
- CoinGecko or signed-poster display data off-chain only.
- Staleness detection.
- Circuit breaker for extreme movements.
- Per-asset decimals normalization.

### ConfidentialWrapperFactory.sol

Deploys ERC-7984-style wrappers for every deployed base asset.

Responsibilities:

- `baseAsset => confidentialWrapper`.
- Batch wrapper setup for all 61 assets.
- Register wrapper addresses in `AssetRegistry`.
- Attach Nox executor and modules.

### BaseConfidentialWrapper.sol

Shared confidential token implementation.

Core functions:

- `wrap(uint256 amount)`
- `unwrap(bytes encryptedAmount)`
- `confidentialTransfer(address to, bytes encryptedAmount)`
- `getEncryptedBalance(address owner) returns (bytes)`
- `approveConfidential(address spender, bytes encryptedAmount)`

Category behavior:

- Stocks: require ERC-3643 KYC before wrap and transfer.
- Crypto: open wrapping and transfers.
- Commodities: validate price feed freshness before wrap/trade.
- Stablecoins: validate peg before mint/wrap.

## 4. Five Mandatory Utilities

### Private Payments

Users transfer hidden amounts between verified investors. On-chain events include asset, sender, and recipient, but never plaintext amount.

Functions:

- `confidentialTransfer(address to, bytes encryptedAmount)`
- `settleAssetTrade(address assetA, address assetB, bytes encryptedAmountA, bytes encryptedAmountB)`

Nox handles amount decryption, sufficient-balance checks, updated encrypted balances, replay protection, and cross-asset atomicity proofs.

### Access Control

Dashboard and institutional tools are gated by encrypted portfolio checks.

Functions:

- `hasMinimumBalance(address user, bytes encryptedThreshold)`
- `hasMinimumPortfolioValue(address user, bytes encryptedThreshold)`
- `getUserTier(address user) returns (uint8)`

Nox computes per-asset balances and total portfolio value inside the TEE, returning only tier decisions.

### Rewards And Dividends

Stocks distribute confidential dividends, crypto assets distribute staking rewards, stablecoins distribute yield, and commodities disable dividends.

Functions:

- `distributeDividend(address assetAddress, address[] holders, bytes[] encryptedAmounts)`
- `claimDividend(address assetAddress, uint256 dividendId)`
- `revealDividendAmount(address assetAddress, uint256 dividendId)`

Events never reveal dividend amount.

### Governance

Voting weight is the confidential sum of all 61 asset holdings.

Functions:

- `createProposal(string description, address[] affectedAssets, uint256 votingDeadline)`
- `castConfidentialVote(uint256 proposalId, bytes encryptedVote, bytes encryptedWeight)`
- `delegateVotingPower(address delegate, bytes encryptedAmount)`
- `finalizeProposal(uint256 proposalId)`

Nox privately validates and tallies encrypted votes.

### Collateral And In-App Currency

Any of the 61 assets can be locked as private collateral. Borrow assets are preferably `cUSDC`, `cUSDT`, `cDAI`, and `cEURC`.

Functions:

- `lockCollateral(address[] assetAddresses, bytes[] encryptedAmounts)`
- `verifyCollateral(address user) returns (bytes TEEProof)`
- `borrowAgainstCollateral(bytes encryptedLoanAmount, address loanAsset, bytes collateralProof)`
- `repayLoan(bytes encryptedRepayAmount, address loanAsset)`
- `liquidatePosition(address user)`

Nox calculates mixed-asset value and health factor privately.

## 5. Price Feed Architecture

The production oracle path is:

```text
Chainlink feed -> staleness check -> circuit breaker -> normalized price
       |
       v
Fallback oracle for unsupported assets
```

Rules:

- US stocks: Chainlink where available, otherwise fallback oracle.
- International stocks: Chainlink plus backup oracle.
- Crypto: Chainlink crypto feeds.
- Commodities: Chainlink commodity feeds.
- Stablecoins: Chainlink USD feeds and peg bounds.

If `priceFeed == address(0)`, deployment must configure fallback oracle support before enabling trading, collateral, or dividends for that asset.

## 6. Data Flows

### cAAPL Wrap

1. User selects `cAAPL`.
2. Frontend checks KYC through ERC-3643 identity registry.
3. User approves base cAAPL.
4. Wrapper locks base cAAPL.
5. Nox creates encrypted minted balance handle.
6. Contract stores encrypted balance.
7. User sees a confidential balance handle, not amount.

### cBTC Wrap

1. User selects `cBTC`.
2. No KYC gate is applied.
3. User approves base cBTC.
4. Wrapper locks base cBTC.
5. Nox updates encrypted balance.

### cGOLD Wrap

1. User selects `cGOLD`.
2. Light KYC status is checked.
3. Price feed freshness is checked.
4. Wrapper locks base cGOLD.
5. Nox updates encrypted balance.

### cUSDC Wrap

1. User selects `cUSDC`.
2. Peg bounds are checked.
3. Wrapper locks base cUSDC 1:1.
4. Nox updates encrypted stablecoin balance.

### cAAPL To cUSDC Trade

1. User selects `cAAPL -> cUSDC`.
2. Frontend fetches prices and slippage settings.
3. Nox checks encrypted cAAPL balance and cUSDC counterparty/settlement liquidity.
4. Contract executes atomic confidential trade.
5. Events include assets and counterparties, never amounts.

## 7. Off-Chain Architecture

Frontend:

- Next.js App Router.
- wagmi and viem for contract interaction.
- RainbowKit-compatible wallet connection.
- Tailwind-compatible design tokens.
- Vercel hosting.

APIs:

- ChainGPT audit, chat, and insights endpoints.
- CoinGecko only for display prices where permitted.
- On-chain price and compliance decisions must rely on contract/oracle state.

## 8. Monorepo Structure

```text
/contracts
  /core
    AssetFactory.sol
    AssetRegistry.sol
    BaseConfidentialToken.sol
    BaseConfidentialWrapper.sol
    ConfidentialWrapperFactory.sol
  /modules
    ComplianceModule.sol
    GovernanceModule.sol
    DividendModule.sol
    CollateralModule.sol
    PriceFeedModule.sol
  /assets
    AssetTypes.sol
  /interfaces
    IERC3643.sol
    IERC7984.sol
    INoxVerifier.sol
  /test
/deploy
  assets.config.ts
/frontend
  /app
  /components
  /hooks
  /lib
  /public
/scripts
  deploy-61-assets.ts
  deploy-arbitrum.ts
  verify-arbiscan.ts
/docs
  technical-specification.md
deployment-checklist.md
feedback.md
README.md
```

## 9. Deployment Architecture

Order:

1. Identity registry storage.
2. Trusted issuers registry.
3. Identity registry.
4. Compliance module.
5. Price feed module.
6. Asset factory.
7. Confidential wrapper factory.
8. `batchDeployAssets()` for all 61 assets.
9. Governance module.
10. Dividend module.
11. Collateral module.
12. Arbiscan verification.
13. Vercel environment update.
14. Vercel production deployment.

Deployments must support resume from partial failure by persisting successful symbols and addresses.

## 10. Build Migration Plan

The current repository has a verified cAAPL implementation and live Vercel demo. The 61-asset migration should happen in layers:

1. Land asset config, technical spec, deployment checklist.
2. Add factory and registry contracts with tests.
3. Add generic base token and migrate cAAPL behavior into it.
4. Add wrapper factory and multi-asset Nox interfaces.
5. Add governance, dividends, and collateral modules.
6. Add multi-page frontend routes.
7. Deploy all 61 assets to Arbitrum Sepolia and verify.
