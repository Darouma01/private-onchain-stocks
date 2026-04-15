# Private Onchain Stocks

[![GitHub stars](https://img.shields.io/github/stars/Darouma01/private-onchain-stocks?style=social)](https://github.com/Darouma01/private-onchain-stocks/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)
[![Network](https://img.shields.io/badge/Network-Arbitrum%20Sepolia-28a0f0)](https://sepolia.arbiscan.io)

Private Onchain Stocks is a compliance-aware confidential stock token protocol for tokenized cAAPL, built for the iExec Vibe Coding Challenge.

- Live demo: https://private-onchain-stocks.vercel.app
- Demo video: TODO: add 4 minute max demo video link
- Testnet deployment: Arbitrum Sepolia, chain ID `421614`
- Mainnet target: Arbitrum One, chain ID `42161`

## Overview

Private Onchain Stocks lets eligible investors hold and transfer tokenized stock exposure without publishing individual balances or transfer amounts. The prototype uses a standard ERC-3643 cAAPL token as the regulated asset layer, then wraps it into a confidential token that represents private stock balances through encrypted handles.

Confidential onchain stocks matter because real-world assets need more than public ERC-20 transfers. Institutions, issuers, and investors need compliance controls, auditability, and privacy at the same time. A public chain can verify that rules are followed, while confidential execution keeps sensitive investor activity from becoming public market data.

iExec Nox and Confidential Tokens power this model by separating public settlement from private computation. Smart contracts hold encrypted balance and amount handles onchain. Nox-style trusted execution can create or disclose private values only when the authorized wallet requests it, allowing the dApp to support confidential balances, confidential transfers, and controlled disclosure.

## Tech Stack

- iExec Nox Protocol: trusted execution layer for private balance disclosure and encrypted handle workflows
- Confidential Token (ERC-7984): confidential wrapper pattern for private cAAPL balances and transfers
- ERC-3643 compliance layer: identity registry, claim topics, trusted issuers, and transfer compliance controls
- ChainGPT AI integration: smart contract audit assistant, onchain insights, and Web3 project assistant
- Frontend: Next.js, wagmi, viem, RainbowKit-compatible wallet flow, Tailwind CSS-compatible UI structure
- Network: Arbitrum Sepolia testnet, with Arbitrum One as the mainnet target

## Architecture

```text
Investor Wallet
      |
      v
Next.js dApp
      |
      +--------------------+
      |                    |
      v                    v
wagmi / viem          ChainGPT API routes
      |                    |
      v                    v
Arbitrum Sepolia      Audit, insights, chat
      |
      v
+-----------------------------+
| ERC-3643 cAAPL Token Suite  |
| - identity registry         |
| - trusted issuers           |
| - claim topics              |
| - compliance checks         |
+-----------------------------+
      |
      | wrap / unwrap
      v
+--------------------------------+
| Confidential cAAPL Token       |
| - encrypted balance handles    |
| - confidential transfers       |
| - Nox-backed balance reveal    |
+--------------------------------+
      |
      v
iExec Nox / TEE-style executor
```

### Smart Contract Interaction Flow

1. A compliant investor receives standard cAAPL through the ERC-3643 token.
2. The investor approves the confidential wrapper to transfer cAAPL.
3. The investor wraps cAAPL into confidential cAAPL.
4. The wrapper escrows standard cAAPL and records an encrypted balance handle.
5. The investor can transfer confidential cAAPL using encrypted amount handles.
6. The recipient receives an updated encrypted balance handle without public amount disclosure.
7. The investor can request a private balance reveal for their own wallet session.
8. The investor can unwrap confidential cAAPL back into standard cAAPL.

### TEE Off-Chain Computation

The protocol is designed around a TEE-assisted privacy model. Encrypted values are represented onchain as `bytes32` handles. Off-chain trusted execution creates encrypted amount handles and performs authorized disclosure, while smart contracts enforce ownership, settlement, and compliance boundaries. This keeps the blockchain verifiable without exposing every portfolio detail to the public mempool, explorers, or indexers.

## Prerequisites

- Node.js `20.x` or newer
- npm `10.x` or newer
- A browser wallet such as MetaMask or Rabby
- Arbitrum Sepolia added to your wallet
- Testnet ETH for gas on Arbitrum Sepolia
- iExec testnet resources from the iExec faucet: https://cdefi.iex.ec/
- ChainGPT API key for AI-powered dashboard features
- Arbiscan/Etherscan API V2 key for contract verification

Required environment variables:

```bash
CHAINGPT_API_KEY=
RPC_URL=

NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_CAAPL_TOKEN_ADDRESS=0xf20a8f2e9f4127c6e83aab89106d09d8c26af6a9
NEXT_PUBLIC_CONFIDENTIAL_CAAPL_ADDRESS=0x136baba4f0037e2f42121bf3d2c0c117dbe7ae83
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.arbiscan.io
COMPLIANCE_CONTRACT_ADDRESS=0x44d4886856c2e2b06a3515fa37fa8e0781f252d5

ARBITRUM_SEPOLIA_RPC_URL=
ARBITRUM_ONE_RPC_URL=
PRIVATE_KEY=
ARBISCAN_API_KEY=
DEPLOY_CHAIN=arbitrum-sepolia
DEMO_INVESTOR_1=0x3CF9BfCD655Bed4A079a6d8a45686a4591c7d76c
DEMO_INVESTOR_2=0xEE3eA6f858aE84dD6959f241DfC257a2f8fA3f53
INITIAL_MINT_RECIPIENT=0x3CF9BfCD655Bed4A079a6d8a45686a4591c7d76c
INITIAL_MINT_AMOUNT=100000000000000000000
MAX_BALANCE_PER_INVESTOR=1000000000000000000000000
MAX_HOLDERS=1000
KYC_TOPIC=1
```

Never commit `.env` files, private keys, RPC secrets, or API keys.

## Installation

Clone the repository:

```bash
git clone git@github.com:Darouma01/private-onchain-stocks.git
cd private-onchain-stocks
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Fill in the required secrets in `.env`, especially:

- `CHAINGPT_API_KEY`
- `RPC_URL`
- `ARBITRUM_SEPOLIA_RPC_URL`
- `PRIVATE_KEY`
- `ARBISCAN_API_KEY`

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000.

Useful checks:

```bash
npm run typecheck
npm run build
```

## Deployment

### Deploy Contracts To Arbitrum Sepolia

Compile the contracts:

```bash
npm run compile:contracts
```

Deploy to Arbitrum Sepolia:

```bash
npm run deploy:arbitrum-sepolia
```

The deployment script writes deployment artifacts to:

```text
deployments/421614/addresses.json
deployments/421614/frontend.env
```

### Verify Contracts

Verify the deployed contracts through the Etherscan API V2 endpoint for Arbitrum Sepolia:

```bash
CHAIN_ID=421614 npm run verify:arbiscan
```

`ARBISCAN_API_KEY` must be a valid Etherscan API V2 key with Arbitrum Sepolia support.

### Update Frontend Addresses

After deployment, copy values from `deployments/421614/frontend.env` into your local `.env` and into your Vercel project environment variables:

```bash
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_CAAPL_TOKEN_ADDRESS=<CAAPLToken>
NEXT_PUBLIC_CONFIDENTIAL_CAAPL_ADDRESS=<ConfidentialCAAPLToken>
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.arbiscan.io
COMPLIANCE_CONTRACT_ADDRESS=<CAAPLCompliance>
```

Redeploy the frontend after updating Vercel environment variables.

## Usage Guide

### Wrap ERC-20 cAAPL Into Confidential cAAPL

1. Open the dApp.
2. Connect a wallet on Arbitrum Sepolia.
3. Use a wallet that has been registered in the ERC-3643 identity registry.
4. Confirm that standard cAAPL is visible in the portfolio panel.
5. Enter the amount to wrap.
6. Approve the confidential wrapper if prompted.
7. Submit the wrap transaction.
8. Confirm that an encrypted balance handle appears.

### Perform A Confidential Transfer

1. Enter a recipient wallet address.
2. Enter the confidential cAAPL amount.
3. The dApp requests an encrypted amount handle.
4. Submit the confidential transfer transaction.
5. The contract updates encrypted balance handles without displaying public transfer amounts as balances.

### Unwrap Back To Standard ERC-20

1. Request or provide an encrypted amount handle for the confidential amount to unwrap.
2. Call `unwrap(bytes32 encryptedAmount, bytes noxData)` on the confidential token.
3. The wrapper releases standard cAAPL back to the investor wallet.
4. The ERC-3643 compliance layer continues to govern the standard cAAPL token.

### Use ChainGPT AI Features

The dashboard includes ChainGPT-powered tools:

- Smart contract auditor: reviews the deployed cAAPL contracts and summarizes risk areas.
- Onchain insights: summarizes aggregate protocol activity without exposing individual private balances.
- Web3 LLM assistant: answers project-specific questions using protocol context.

Set `CHAINGPT_API_KEY` before using the AI features locally or in production.

## Smart Contract Documentation

### Contract Addresses

#### Arbitrum Sepolia Testnet

| Contract | Address | Explorer |
| --- | --- | --- |
| `DemoClaimIssuer` | `0xfa506a1ac1c5379776457eca3ffdf54658ab3a47` | [Arbiscan](https://sepolia.arbiscan.io/address/0xfa506a1ac1c5379776457eca3ffdf54658ab3a47) |
| `CAAPLClaimTopicsRegistry` | `0x340e61a9a10dfce2b481f14c17eb95b029f42620` | [Arbiscan](https://sepolia.arbiscan.io/address/0x340e61a9a10dfce2b481f14c17eb95b029f42620) |
| `CAAPLTrustedIssuersRegistry` | `0xa6757048c60e1a5d1b94c2cd6c6b067b71603f2b` | [Arbiscan](https://sepolia.arbiscan.io/address/0xa6757048c60e1a5d1b94c2cd6c6b067b71603f2b) |
| `CAAPLIdentityRegistryStorage` | `0xead9dceb94b839159efac751218d0c3f7d1cb13f` | [Arbiscan](https://sepolia.arbiscan.io/address/0xead9dceb94b839159efac751218d0c3f7d1cb13f) |
| `CAAPLIdentityRegistry` | `0xb2afb921aa8ce9f53f678782840216661f0d849d` | [Arbiscan](https://sepolia.arbiscan.io/address/0xb2afb921aa8ce9f53f678782840216661f0d849d) |
| `CAAPLCompliance` | `0x44d4886856c2e2b06a3515fa37fa8e0781f252d5` | [Arbiscan](https://sepolia.arbiscan.io/address/0x44d4886856c2e2b06a3515fa37fa8e0781f252d5) |
| `CAAPLToken` | `0xf20a8f2e9f4127c6e83aab89106d09d8c26af6a9` | [Arbiscan](https://sepolia.arbiscan.io/address/0xf20a8f2e9f4127c6e83aab89106d09d8c26af6a9) |
| `DemoNoxConfidentialExecutor` | `0x997cd0d393fce9c3726ccdb02cc94f9b222f4182` | [Arbiscan](https://sepolia.arbiscan.io/address/0x997cd0d393fce9c3726ccdb02cc94f9b222f4182) |
| `ConfidentialCAAPLToken` | `0x136baba4f0037e2f42121bf3d2c0c117dbe7ae83` | [Arbiscan](https://sepolia.arbiscan.io/address/0x136baba4f0037e2f42121bf3d2c0c117dbe7ae83) |

#### Arbitrum One Mainnet

| Contract | Address |
| --- | --- |
| `CAAPLToken` | Not deployed yet |
| `ConfidentialCAAPLToken` | Not deployed yet |
| `CAAPLCompliance` | Not deployed yet |

### Key Functions

| Contract | Function | Description |
| --- | --- | --- |
| `CAAPLToken` | `balanceOf(address account)` | Returns the standard ERC-20 cAAPL balance for an address. |
| `CAAPLToken` | `approve(address spender, uint256 amount)` | Approves the confidential wrapper to escrow standard cAAPL. |
| `CAAPLToken` | `transfer(address to, uint256 amount)` | Transfers standard cAAPL subject to ERC-3643 compliance rules. |
| `ConfidentialCAAPLToken` | `wrap(uint256 plaintextAmount, bytes noxData)` | Escrows standard cAAPL and creates confidential cAAPL balance state. |
| `ConfidentialCAAPLToken` | `unwrap(bytes32 encryptedAmount, bytes noxData)` | Converts confidential cAAPL back into standard cAAPL. |
| `ConfidentialCAAPLToken` | `confidentialTransfer(address to, bytes32 amount, bytes data)` | Transfers confidential cAAPL using an encrypted amount handle. |
| `ConfidentialCAAPLToken` | `getEncryptedBalance(address account)` | Returns the encrypted balance handle for an account. |
| `ConfidentialCAAPLToken` | `decryptBalance(address owner, bytes noxData)` | Reveals an authorized wallet balance through the Nox disclosure path. |
| `CAAPLIdentityRegistry` | `isVerified(address investor)` | Checks whether an investor is registered and eligible. |
| `CAAPLCompliance` | `holderCount()` | Returns the current number of compliant token holders tracked by the compliance contract. |
| `DemoNoxConfidentialExecutor` | `createHandle(uint256 value)` | Creates a demo encrypted handle for confidential amount workflows. |

## Demo

Screenshot or GIF:

```text
TODO: add screenshot or GIF path, for example:
docs/demo/private-onchain-stocks-dashboard.gif
```

Demo video:

```text
TODO: add 4 minute max video link
```

Suggested judging flow:

1. Open https://private-onchain-stocks.vercel.app.
2. Connect a wallet on Arbitrum Sepolia.
3. Use a pre-approved demo investor wallet.
4. Review aggregate cAAPL protocol data.
5. Run the ChainGPT smart contract audit.
6. Wrap standard cAAPL into confidential cAAPL.
7. Create a confidential transfer.
8. Reveal only the connected wallet's confidential balance.
9. Open the verified Arbiscan links for deployed contracts.

## Originality Statement

Private Onchain Stocks was built during the iExec Vibe Coding Challenge as a hackathon prototype for privacy-preserving tokenized stock workflows.

Third-party libraries and services used:

- iExec Nox Protocol concepts and confidential execution model
- OpenZeppelin contracts
- Next.js
- React
- wagmi
- viem
- ChainGPT APIs
- Arbitrum Sepolia
- Vercel
- solc / solcjs

Built from scratch during the challenge:

- ERC-3643-style cAAPL token suite for demo compliance workflows
- Confidential cAAPL wrapper contract
- Demo Nox confidential executor interface and encrypted handle flow
- Arbitrum Sepolia deployment and verification scripts
- Next.js dApp dashboard
- Wallet-connected wrap, transfer, and reveal flows
- ChainGPT smart contract auditor, insights panel, and project assistant integration
- Public judge-facing deployment configuration

## License

MIT License

Copyright (c) 2026 Private Onchain Stocks contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
