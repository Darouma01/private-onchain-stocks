import { ConfidentialPortfolio } from "@/components/ConfidentialPortfolio";
import { KycStatusCard } from "@/components/KycStatusCard";
import { OnChainDataInsightsPanel } from "@/components/OnChainDataInsightsPanel";
import { SmartContractAuditorWidget } from "@/components/SmartContractAuditorWidget";
import { TestnetBanner } from "@/components/TestnetBanner";
import { WalletPanel } from "@/components/WalletPanel";
import { Web3LLMAssistant } from "@/components/Web3LLMAssistant";

export default function HomePage() {
  return (
    <main className="page">
      <TestnetBanner />
      <header className="header">
        <h1>Private Onchain Stocks</h1>
        <p>
          Manage testnet cAAPL, check your eligibility, wrap into confidential cAAPL, and audit the contracts before
          you interact.
        </p>
      </header>

      <div className="top-grid">
        <WalletPanel />
        <KycStatusCard />
      </div>

      <div className="primary-grid">
        <ConfidentialPortfolio />
        <OnChainDataInsightsPanel />
      </div>

      <div className="grid">
        <SmartContractAuditorWidget />
        <Web3LLMAssistant />
      </div>
    </main>
  );
}
