import { OnChainDataInsightsPanel } from "@/components/OnChainDataInsightsPanel";
import { SmartContractAuditorWidget } from "@/components/SmartContractAuditorWidget";
import { Web3LLMAssistant } from "@/components/Web3LLMAssistant";

export default function HomePage() {
  return (
    <main className="page">
      <header className="header">
        <h1>Private Onchain Stocks</h1>
        <p>
          AI-assisted cAAPL dashboard for contract review, aggregate protocol insight, and confidential-transfer
          education.
        </p>
      </header>

      <div className="grid">
        <SmartContractAuditorWidget />
        <OnChainDataInsightsPanel />
        <Web3LLMAssistant />
      </div>
    </main>
  );
}
