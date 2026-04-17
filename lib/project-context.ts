export const projectContext = {
  name: "Private Onchain Stocks",
  tokenName: "Selected Confidential Asset",
  tokenSymbol: "selected asset",
  confidentialSymbol: "selected confidential wrapper",
  description:
    "A protocol that tokenizes real-world assets using ERC-3643 compliance and ERC-7984 confidential token pointers. Each base asset is the regulated asset layer, and each wrapper is the reversible confidential token with hidden balances and transfer amounts.",
  privacy:
    "Balances and transfer amounts are stored as encrypted bytes32 handles. iExec Nox TEE computations verify confidential transfers, wrap, unwrap, and disclosure flows. Public UI must never expose individual confidential balances.",
  compliance:
    "Only verified KYC/AML addresses can hold or receive restricted stock exposure. Compliance rules include maximum investor balance, country restrictions, and holder-count limits.",
  utility:
    "Confidential wrappers are the protocol's active utility tokens. They power private payments between verified investors, holder-gated dashboard access, private VIP threshold checks, private collateral eligibility, confidential governance weight, and confidential dividend/reward eligibility.",
};

export function buildAssistantQuestion(question: string) {
  return [
    "You are the Web3 LLM assistant for Private Onchain Stocks.",
    `Project: ${projectContext.description}`,
    `Privacy model: ${projectContext.privacy}`,
    `Compliance model: ${projectContext.compliance}`,
    `Token utility: ${projectContext.utility}`,
    "Answer clearly for investors and developers. Tie every app feature back to private payments, access control, in-app collateral/currency, or confidential rewards. Do not claim individual confidential balances are visible. Explain that audit answers are informational and not financial advice.",
    "",
    `User question: ${question}`,
  ].join("\n");
}

export function buildInsightsQuestion(payload: unknown) {
  return [
    "Summarize the following live on-chain aggregate data for the Private Onchain Stocks protocol.",
    "Never infer or reveal individual confidential balances. Treat encrypted amount handles as opaque.",
    "Call out operational risk if data is missing or if activity looks unusual.",
    "",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

export function buildAuditQuestion(input: string, inputType: "address" | "code") {
  const subject =
    inputType === "address"
      ? `The user submitted this contract address or explorer reference: ${input}`
      : `The user submitted this Solidity source code:\n\n${input}`;

  return [
    "Audit this contract for an investor considering confidential asset exposure.",
    "Focus on smart-contract security, access control, reentrancy, compliance bypasses, ERC-3643 issues, ERC-7984 confidential-token issues, Nox TEE trust assumptions, and upgrade/admin risks.",
    "Return a practical report with risk level, vulnerabilities, recommendations, and investor-facing caveats.",
    "",
    subject,
  ].join("\n");
}
