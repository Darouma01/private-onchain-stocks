"use client";

import { ContractAuditor } from "@/components/ai/ContractAuditor";
import { LLMAssistant } from "@/components/ai/LLMAssistant";
import { OnChainInsights } from "@/components/ai/OnChainInsights";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";
import { NetworkBadge, KYCBadge } from "@/components/SharedUi";
import { categoryLabels } from "@/lib/deployed-assets";

export function PublicAiToolsSection() {
  const { selectedAsset } = useSelectedAsset();

  return (
    <section className="ai-tools-dashboard" id="ai-tools-public">
      <div className="ai-tools-header">
        <div>
          <span className="chaingpt-badge">ChainGPT</span>
          <h2>AI Tools</h2>
          <p>Public assistant, public contract metrics, and preview audits for judges.</p>
        </div>
        <div className="ai-header-badges">
          <NetworkBadge />
          <KYCBadge status={selectedAsset.requiresKYC ? "Required" : "Open"} />
          <span className="category-chip">{categoryLabels[selectedAsset.category]}</span>
        </div>
      </div>
      <section className="ai-tool-grid">
        <ContractAuditor asset={selectedAsset} />
        <LLMAssistant asset={selectedAsset} />
        <OnChainInsights asset={selectedAsset} />
      </section>
    </section>
  );
}
