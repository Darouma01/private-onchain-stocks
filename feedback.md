# iExec Vibe Coding Challenge - Developer Feedback

## Overview
Built: Private Onchain Stocks  
A confidential multi-asset DeFi protocol with 61 assets on Arbitrum Sepolia.

## Nox Protocol

### What worked well
- The core model is strong: wrapped balances become encrypted handles, and the wrapper/Nox split is clear once the flow is understood.
- The `wrap(amount, "0x")` pattern was simple to implement once I confirmed that the demo stack was using `"0x"` for `noxData`.
- `decryptBalance(owner, "0x")` returning a plaintext value for the wallet owner made it possible to build a clean "private reveal" UX.
- The demo executor model made it possible to prove wrap, reveal, and confidential transfer behavior on Arbitrum Sepolia without inventing mock infrastructure.

### Pain points
- The role of `noxData` was initially unclear. The contracts consistently take it, but the expected value and generation model were not obvious from the docs.
- I expected a frontend-oriented iExec/Nox SDK for TypeScript that would cover handle creation, encryption, and helper utilities. I did not find one in npm, and that slowed integration.
- The difference between the demo Nox executor address and the deployed executor address was easy to get wrong. In my build, this caused a real failure mode: a handle created against the wrong executor looked valid, but `confidentialTransfer` reverted with `nox: zero amount`.
- Understanding which reads were safe as plain `view` calls and which operations depended on Nox state took more trial and inspection than it should have.

### What I would improve
- Add one canonical "frontend integration" guide that explicitly documents `noxData`, handle generation, reveal semantics, and the expected executor address flow.
- Ship a small TypeScript SDK or helper package for:
  - create encrypted amount handle
  - reveal owner balance
  - verify handle/executor compatibility
  - encode common demo flows
- Document the "wrong executor / zero amount" failure mode directly, because it is a realistic integration bug.
- Provide one minimal end-to-end reference dApp that covers wrap -> reveal -> confidential transfer with current APIs.

## Confidential Token (ERC-7984)

### What worked well
- `getEncryptedBalance(address)` returning a `bytes32` handle is a clean primitive. It makes it easy to detect whether a wallet holds a confidential position without exposing the amount.
- `decryptBalance` as a `view` function made the holder-side reveal flow much simpler than a write-based decryption flow would have been.
- The wrapper surface is compact. `wrap`, `unwrap`, `confidentialTransfer`, `getEncryptedBalance`, and `decryptBalance` are enough to demonstrate a real confidential asset lifecycle.

### Pain points
- Confidential supply is stored as an encrypted handle, which is correct for privacy, but it means a naive frontend will show `0` or incorrect values if it tries to treat the wrapper like a normal ERC-20.
- Testnet demos still need explicit seeding. If base tokens are not minted and wrapped first, the UI legitimately shows zero supply, zero holdings, and inactive utility states.
- The ABI names were workable, but the exact integration expectations around confidential supply, reveal permissions, and handle ownership were not obvious up front.

### Suggestions
- Add a reference "metrics strategy" doc showing how to expose public proof safely when supply and balances are encrypted.
- Provide a recommended event/indexing pattern for demo dashboards and judge-facing proof pages.
- Publish a clearer reference for owner-scoped reveal behavior, especially the requirement that the requester must be the owner.

## Documentation

### Helpful resources
- `docs.iex.ec/nox-protocol`: 3/5. Helpful for high-level framing, but not enough by itself for smooth frontend implementation.
- `cdefi.iex.ec` demo: very useful for understanding the intended UX and proving that the flow is conceptually viable.
- `cdefi-wizard.iex.ec`: useful as a discovery tool, but I still needed to inspect contracts and tests directly for real integration details.
- `npm @iexec-nox` packages: I did not find a usable TypeScript/frontend package for this build. That was unexpected.

### Gaps found
- `noxData` generation and expected values were not documented clearly enough for a frontend engineer.
- There was no obvious TypeScript SDK path for amount encryption / handle creation.
- The documentation did not make the "demo executor vs deployed executor" distinction explicit enough.
- I had to rely on contract tests and source inspection to confirm real integration behavior.

## ChainGPT Integration

### Experience
- `@chaingpt/generalchat`: 3/5
- `@chaingpt/smartcontractauditor`: 3/5
- API quality: usable for a hackathon demo, but not yet something I would treat as authoritative without verification.

### What worked
- It was straightforward to wire a public assistant and contract-auditor style interface into the app.
- ChainGPT was useful as a UI-facing AI layer for judges who wanted a conversational way to inspect the protocol.

### What could improve
- Output quality still needs careful validation, especially for niche Web3 systems like Nox and confidential wrappers.
- I would like stronger structured output guarantees and more predictable asset-specific context handling.
- Better guidance for production-safe prompting and result validation would help.

## Vibe Coding Experience

### AI Tools Used
- Claude Code: not used directly in this build.
- Cursor: not used directly in this build.
- ChainGPT: used for the in-app assistant and auditor demo features.
- OpenAI Codex / GPT-based coding agent: used heavily for implementation, refactors, debugging, deployment fixes, and live-chain validation.

### How AI helped
- Accelerated repetitive frontend refactors across the utility, portfolio, markets, and AI panels.
- Helped audit ABI usage and find hardcoded asset assumptions.
- Helped move faster on operational debugging, especially around live-chain reads, price feeds, and wallet-state wiring.

### Where AI struggled
- iExec Nox was not strongly represented in model priors, so prompts needed manual correction around `noxData`, handle generation, and reveal semantics.
- AI was prone to assuming a standard ERC-20 mental model where the wrapper was actually using encrypted handles and demo-executor indirection.
- Live operational issues still required direct contract inspection and real Sepolia transactions.

## Ratings

| Tool | Rating | Comment |
|------|--------|---------|
| Nox Protocol | 4/5 | Strong privacy model and credible demo primitives, but frontend integration guidance needs work. |
| Confidential Token | 4/5 | Clean wrapper surface and good developer ergonomics once the model is understood. |
| Documentation | 3/5 | Good starting point, but not enough for a smooth TypeScript dApp integration without source inspection. |
| cdefi.iex.ec demo | 4/5 | Helpful for understanding intended product behavior and proving the UX can be demoed. |
| ChainGPT API | 3/5 | Useful for demo augmentation, but outputs still need verification. |
| Vibe coding overall | 4/5 | Productive and fast, but niche protocol details still required manual engineering judgment. |

## Final Thoughts

### Would you build on iExec again?
Yes, especially for privacy-preserving RWA and confidential DeFi workflows. The underlying model is compelling. I would want better frontend tooling and clearer integration docs before treating it as a faster production path.

### Most exciting thing about Nox
The most exciting part is that it lets a protocol prove useful properties, such as ownership, sufficiency, or eligibility, without forcing balances and transfer amounts into public visibility. That is the right direction for serious onchain finance.

### One thing iExec should prioritize next
Ship an official TypeScript developer toolkit and one authoritative end-to-end dApp reference that covers handle creation, `noxData`, reveal flows, confidential transfer, and common integration failures.
