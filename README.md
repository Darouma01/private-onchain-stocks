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
| `DemoClaimIssuer` | `0xfa506a1ac1c5379776457eca3ffdf54658ab3a47` | `https://sepolia.arbiscan.io/address/0xfa506a1ac1c5379776457eca3ffdf54658ab3a47` |
| `CAAPLClaimTopicsRegistry` | `0x340e61a9a10dfce2b481f14c17eb95b029f42620` | `https://sepolia.arbiscan.io/address/0x340e61a9a10dfce2b481f14c17eb95b029f42620` |
| `CAAPLTrustedIssuersRegistry` | `0xa6757048c60e1a5d1b94c2cd6c6b067b71603f2b` | `https://sepolia.arbiscan.io/address/0xa6757048c60e1a5d1b94c2cd6c6b067b71603f2b` |
| `CAAPLIdentityRegistryStorage` | `0xead9dceb94b839159efac751218d0c3f7d1cb13f` | `https://sepolia.arbiscan.io/address/0xead9dceb94b839159efac751218d0c3f7d1cb13f` |
| `CAAPLIdentityRegistry` | `0xb2afb921aa8ce9f53f678782840216661f0d849d` | `https://sepolia.arbiscan.io/address/0xb2afb921aa8ce9f53f678782840216661f0d849d` |
| `CAAPLCompliance` | `0x44d4886856c2e2b06a3515fa37fa8e0781f252d5` | `https://sepolia.arbiscan.io/address/0x44d4886856c2e2b06a3515fa37fa8e0781f252d5` |
| `CAAPLToken` | `0xf20a8f2e9f4127c6e83aab89106d09d8c26af6a9` | `https://sepolia.arbiscan.io/address/0xf20a8f2e9f4127c6e83aab89106d09d8c26af6a9` |
| `DemoNoxConfidentialExecutor` | `0x997cd0d393fce9c3726ccdb02cc94f9b222f4182` | `https://sepolia.arbiscan.io/address/0x997cd0d393fce9c3726ccdb02cc94f9b222f4182` |
| `ConfidentialCAAPLToken` | `0x136baba4f0037e2f42121bf3d2c0c117dbe7ae83` | `https://sepolia.arbiscan.io/address/0x136baba4f0037e2f42121bf3d2c0c117dbe7ae83` |

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
