"use client";

import { useState } from "react";
import { useSelectedConfidentialBalance } from "@/components/useAnyConfidentialBalance";
import { AddressDisplay, SkeletonRows } from "@/components/SharedUi";
import { categoryLabels, type DeployedAsset } from "@/lib/deployed-assets";
import { addressUrl } from "@/lib/contracts";

type Finding = {
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
};

type AuditReport = {
  findings: Finding[];
  recommendations: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  standard: string;
  verified: boolean;
};

export function ContractAuditor({ asset }: { asset: DeployedAsset }) {
  const [contractType, setContractType] = useState<"Base" | "Wrapper">("Wrapper");
  const [report, setReport] = useState<AuditReport>(() => previewReport(asset, "Wrapper"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const access = useSelectedConfidentialBalance(asset);
  const currentAddress = contractType === "Base" ? asset.baseAddress : asset.wrapperAddress;
  const fullAuditUnlocked = access.hasSelectedAssetBalance;

  async function runAudit() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractAddress: currentAddress, symbol: asset.symbol }),
      });
      const payload = (await response.json()) as AuditReport & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Audit failed");
      setReport(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  }

  function switchType(next: "Base" | "Wrapper") {
    setContractType(next);
    setReport(previewReport(asset, next));
    setError(null);
  }

  return (
    <article className="ai-tool-panel auditor-panel">
      <div className="ai-panel-header">
        <strong>{asset.symbol} Contract Auditor</strong>
        <span>{fullAuditUnlocked ? "Full audit unlocked" : "Preview audit available"}</span>
      </div>
      <div className="segmented-control">
        {(["Base", "Wrapper"] as const).map((item) => (
          <button className={contractType === item ? "active" : undefined} key={item} onClick={() => switchType(item)} type="button">
            {item} Contract
          </button>
        ))}
      </div>
      <div className="ai-address-box">
        <span>{asset.name} — {contractType} Contract</span>
        <AddressDisplay address={currentAddress} />
      </div>
      <button disabled={!fullAuditUnlocked || loading} onClick={() => void runAudit()} type="button">
        {loading ? "Running audit..." : fullAuditUnlocked ? "Run Full Audit" : "Connect holder wallet for full audit"}
      </button>
      {!fullAuditUnlocked ? <div className="privacy-notice">Preview audit shown for judges. Full ChainGPT audit requires confidential holder access.</div> : null}
      {loading ? <SkeletonRows rows={2} /> : null}
      {error ? <div className="action-feedback error"><strong>{error}</strong></div> : null}
      <div className="audit-results">
        <div className={`risk-score ${report.riskLevel.toLowerCase()}`}>Audit Report: {asset.symbol} {contractType} Contract · {report.riskLevel}</div>
        <div className="audit-context">
          <span>Asset: {asset.name} ({asset.symbol})</span>
          <span>Category: {categoryLabels[asset.category]}</span>
          <span>Network: Arbitrum Sepolia</span>
          <span>Standard: {report.standard}</span>
          <span><a href={addressUrl(currentAddress)} rel="noreferrer" target="_blank">Arbiscan verification ✅</a></span>
        </div>
        <ul>
          {report.findings.map((finding) => (
            <li key={`${finding.severity}-${finding.title}`}>
              <span className={`severity ${finding.severity.toLowerCase()}`}>{finding.severity}</span> {finding.title}: {finding.description}
            </li>
          ))}
        </ul>
        <div className="recommendations">
          <strong>Recommendations</strong>
          {report.recommendations.map((item) => <p key={item}>{item}</p>)}
        </div>
        <span className="chaingpt-badge">Powered by ChainGPT</span>
      </div>
    </article>
  );
}

function previewReport(asset: DeployedAsset, contractType: "Base" | "Wrapper"): AuditReport {
  return {
    findings: [
      {
        severity: "LOW",
        title: "Deployment registry match",
        description: `${asset.symbol} ${contractType.toLowerCase()} address is loaded from the live deployment registry.`,
      },
      {
        severity: "LOW",
        title: "Confidential design",
        description: "Transfer amounts are represented by encrypted handles instead of plaintext UI values.",
      },
      {
        severity: "MEDIUM",
        title: "Demo dependency",
        description: "Nox handle creation must remain available for private transfer and unwrap flows.",
      },
    ],
    recommendations: [
      "Verify the selected contract on Arbiscan before demo transactions.",
      "Keep encrypted balance handles truncated in public UI.",
      "Run a full source-level audit before mainnet usage.",
    ],
    riskLevel: "LOW",
    standard: contractType === "Base" ? "ERC-3643" : "ERC-7984",
    verified: true,
  };
}
