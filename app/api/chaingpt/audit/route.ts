import { NextResponse } from "next/server";
import { createAuditorClient, extractBotText, normalizeChainGPTError } from "@/lib/chaingpt";
import { buildAuditQuestion } from "@/lib/project-context";
import type { AuditRiskLevel } from "@/types/ai";

export const runtime = "nodejs";

type AuditRequest = {
  input: string;
  inputType: "address" | "code";
  sdkUniqueId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AuditRequest>;
    const input = body.input?.trim();
    const inputType = body.inputType;

    if (!input) {
      return NextResponse.json({ error: "Contract address or Solidity code is required" }, { status: 400 });
    }
    if (inputType !== "address" && inputType !== "code") {
      return NextResponse.json({ error: "inputType must be address or code" }, { status: 400 });
    }

    const auditInput = inputType === "address" ? await resolveAddressToSourceOrReference(input) : input;
    const auditor = createAuditorClient();
    const response = await auditor.auditSmartContractBlob({
      question: buildAuditQuestion(auditInput, inputType),
      chatHistory: body.sdkUniqueId ? "on" : "off",
      ...(body.sdkUniqueId ? { sdkUniqueId: body.sdkUniqueId } : {}),
    });

    const report = extractBotText(response);

    return NextResponse.json({
      report,
      riskLevel: inferRiskLevel(report),
      vulnerabilities: extractSectionBullets(report, ["vulnerabilities", "issues", "findings"]),
      recommendations: extractSectionBullets(report, ["recommendations", "mitigations", "improvements"]),
    });
  } catch (error) {
    return NextResponse.json({ error: normalizeChainGPTError(error) }, { status: 500 });
  }
}

async function resolveAddressToSourceOrReference(input: string) {
  const address = input.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return address;
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return `${address}\n\nNo ETHERSCAN_API_KEY is configured, so audit this address by known public/explorer context and clearly state if verified source code is unavailable.`;
  }

  const url = new URL("https://api.etherscan.io/api");
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return `${address}\n\nEtherscan source lookup failed with HTTP ${response.status}.`;
  }

  const payload = (await response.json()) as {
    status?: string;
    result?: Array<{ SourceCode?: string; ContractName?: string; ABI?: string }>;
  };
  const source = payload.result?.[0]?.SourceCode?.trim();

  if (!source) {
    return `${address}\n\nVerified source code was not returned by Etherscan.`;
  }

  return `Address: ${address}\nContract: ${payload.result?.[0]?.ContractName ?? "unknown"}\n\n${source}`;
}

function inferRiskLevel(report: string): AuditRiskLevel {
  const lower = report.toLowerCase();
  if (lower.includes("critical")) return "Critical";
  if (lower.includes("high risk") || lower.includes("high severity") || lower.includes(" high ")) return "High";
  if (lower.includes("medium risk") || lower.includes("medium severity") || lower.includes(" moderate ")) {
    return "Medium";
  }
  if (lower.includes("low risk") || lower.includes("low severity") || lower.includes("no critical")) return "Low";
  return "Unknown";
}

function extractSectionBullets(report: string, labels: string[]) {
  const lines = report
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const results: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[*#:]/g, "");
    if (labels.some((label) => normalized.includes(label))) {
      collecting = true;
      continue;
    }

    if (collecting && /^#{1,6}\s|^[A-Z][A-Za-z\s]+:$/.test(line)) {
      break;
    }

    if (collecting && /^[-*•\d.]+\s+/.test(line)) {
      results.push(line.replace(/^[-*•\d.]+\s+/, ""));
    }

    if (results.length >= 8) {
      break;
    }
  }

  return results;
}
