# Private Onchain Stocks

Private Onchain Stocks is a cAAPL prototype for the iExec Vibe Coding Challenge. It combines ERC-3643 compliance, an ERC-7984-style confidential wrapper, iExec Nox TEE interfaces, and ChainGPT-powered investor tools.

## What Is Included

- ERC-3643 cAAPL token suite:
  - token
  - identity registry
  - identity registry storage
  - trusted issuers registry
  - claim topics registry
  - compliance contract
- ERC-7984-style confidential cAAPL wrapper:
  - encrypted balance handles
  - confidential transfer functions
  - reversible wrap and unwrap flow
  - Nox verifier interface stubs
- Next.js dashboard:
  - ChainGPT smart contract auditor
  - aggregate on-chain insights panel
  - Web3 LLM assistant with project context

## Target Networks

| Environment | Network | Chain ID | Explorer |
| --- | --- | ---: | --- |
| Testnet | Arbitrum Sepolia | `421614` | `https://sepolia.arbiscan.io` |
| Mainnet | Arbitrum One | `42161` | `https://arbiscan.io` |

The challenge demo should deploy to Arbitrum Sepolia first.

## Arbitrum Sepolia Deployment

Current Arbitrum Sepolia deployment, chain ID `421614`:

| Contract | Address | Arbiscan |
| --- | --- | --- |
| `DemoClaimIssuer` | `0xffb96d7034ca5c0f6b8c864fd94eac94aa2ce94f` | `https://sepolia.arbiscan.io/address/0xffb96d7034ca5c0f6b8c864fd94eac94aa2ce94f` |
| `CAAPLClaimTopicsRegistry` | `0x05886265d11062739180346b02a7de5e2e094a03` | `https://sepolia.arbiscan.io/address/0x05886265d11062739180346b02a7de5e2e094a03` |
| `CAAPLTrustedIssuersRegistry` | `0x925ea8a02b4fa4d1d7ef5d6ebebb70cdb3bd94a1` | `https://sepolia.arbiscan.io/address/0x925ea8a02b4fa4d1d7ef5d6ebebb70cdb3bd94a1` |
| `CAAPLIdentityRegistryStorage` | `0xf6bd6cf766f4ae1ee56283fcbbbd80fc07d80078` | `https://sepolia.arbiscan.io/address/0xf6bd6cf766f4ae1ee56283fcbbbd80fc07d80078` |
| `CAAPLIdentityRegistry` | `0x3acf0012750d801b991daa04d105112cc4647801` | `https://sepolia.arbiscan.io/address/0x3acf0012750d801b991daa04d105112cc4647801` |
| `CAAPLCompliance` | `0x510528e4ca174998cdf81e9136e54d2278ea0593` | `https://sepolia.arbiscan.io/address/0x510528e4ca174998cdf81e9136e54d2278ea0593` |
| `CAAPLToken` | `0x216a6af734c8604e79f279213e42d80a1e38e670` | `https://sepolia.arbiscan.io/address/0x216a6af734c8604e79f279213e42d80a1e38e670` |
| `DemoNoxConfidentialExecutor` | `0x3ba648bdb0a352a7d238ec78f14f3fdc15053270` | `https://sepolia.arbiscan.io/address/0x3ba648bdb0a352a7d238ec78f14f3fdc15053270` |
| `ConfidentialCAAPLToken` | `0x8769428879b1d72b3f078cf445abc7f20e07d365` | `https://sepolia.arbiscan.io/address/0x8769428879b1d72b3f078cf445abc7f20e07d365` |

Demo identities:

```text
0x3CF9BfCD655Bed4A079a6d8a45686a4591c7d76c
0xEE3eA6f858aE84dD6959f241DfC257a2f8fA3f53
```

Initial mint:

```text
Recipient: 0x3CF9BfCD655Bed4A079a6d8a45686a4591c7d76c
Amount: 100 cAAPL
```

## Environment

Copy `.env.example` and configure real values:

```bash
cp .env.example .env
```

Required for AI and on-chain dashboard features:

```bash
CHAINGPT_API_KEY=
RPC_URL=
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_CAAPL_TOKEN_ADDRESS=
NEXT_PUBLIC_CONFIDENTIAL_CAAPL_ADDRESS=
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.arbiscan.io
COMPLIANCE_CONTRACT_ADDRESS=
ETHERSCAN_API_KEY=
```

Required for deployment and verification:

```bash
ARBITRUM_SEPOLIA_RPC_URL=
ARBITRUM_ONE_RPC_URL=
PRIVATE_KEY=
ARBISCAN_API_KEY=
```

Never commit `.env` or private keys.

`ARBISCAN_API_KEY` must be a valid Etherscan API V2 key with Arbitrum Sepolia support. Explorer-specific V1 endpoints are deprecated.

## Install

```bash
npm install
```

## Frontend

```bash
npm run dev
npm run typecheck
npm run build
```

The app is built with Next.js App Router and server-side API routes so ChainGPT credentials stay off the client.

## Contract Compile

Local Foundry may be used when available:

```bash
forge build
```

The repository also supports direct `solcjs` compilation:

```bash
npx solcjs --base-path . --include-path node_modules --include-path lib \
  --bin --abi -o build/solc \
  contracts/src/CAAPL3643Suite.sol \
  contracts/src/ConfidentialCAAPLToken.sol \
  contracts/src/DemoInfrastructure.sol \
  test/ConfidentialCAAPLToken.t.sol
```

Or:

```bash
npm run compile:contracts
```

## Deploy And Verify

Deploy to Arbitrum Sepolia:

```bash
npm run compile:contracts
npm run deploy:arbitrum-sepolia
```

Verify on Arbiscan through Etherscan API V2:

```bash
CHAIN_ID=421614 npm run verify:arbiscan
```

## Core Files

- `contracts/src/CAAPL3643Suite.sol`
- `contracts/src/ConfidentialCAAPLToken.sol`
- `test/ConfidentialCAAPLToken.t.sol`
- `app/api/chaingpt/audit/route.ts`
- `app/api/chaingpt/insights/route.ts`
- `app/api/chaingpt/chat/route.ts`
- `components/SmartContractAuditorWidget.tsx`
- `components/OnChainDataInsightsPanel.tsx`
- `components/Web3LLMAssistant.tsx`

## Hosting

Recommended frontend host: Vercel.

Vercel settings:

```text
Framework: Next.js
Install command: npm install
Build command: npm run build
Production branch: main
```

Add the environment variables from `.env.example` in the Vercel dashboard. The public Vercel URL is the judge-facing dApp URL.

## Judge Flow

1. Open the public dApp URL.
2. Connect a wallet on Arbitrum Sepolia, chain ID `421614`.
3. Use a pre-approved demo investor wallet.
4. Review aggregate cAAPL data.
5. Run ChainGPT audit against the deployed cAAPL contracts.
6. Wrap standard cAAPL into confidential cAAPL.
7. Run a confidential transfer.
8. Check encrypted balance handles.
9. Use Nox-backed disclosure for the user's own balance.
10. Open verified Arbiscan links for all deployed contracts.

## Privacy Note

The confidential wrapper stores balances and transfer amounts as encrypted `bytes32` handles. The dashboard only displays aggregate protocol data and anonymized transfer activity. It must not display individual confidential balances.
