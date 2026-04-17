import { ConfidentialPortfolio } from "@/components/ConfidentialPortfolio";
import { ConfidentialTokenUtilityPanel } from "@/components/ConfidentialTokenUtilityPanel";
import { InvestorDashboardGate } from "@/components/InvestorDashboardGate";
import { KycStatusCard } from "@/components/KycStatusCard";
import { LandingHero } from "@/components/LandingHero";
import { MultiAssetProtocolDashboard } from "@/components/MultiAssetProtocolDashboard";
import { OnChainDataInsightsPanel } from "@/components/OnChainDataInsightsPanel";
import { SmartContractAuditorWidget } from "@/components/SmartContractAuditorWidget";
import { WalletPanel } from "@/components/WalletPanel";
import { Web3LLMAssistant } from "@/components/Web3LLMAssistant";

export default function HomePage() {
  return (
    <main className="page">
      <LandingHero />

      <div className="top-grid" id="wallet">
        <WalletPanel />
        <KycStatusCard />
      </div>

      <div id="portfolio">
        <MultiAssetProtocolDashboard />
      </div>

      <div className="primary-grid" id="portfolio-utilities">
        <ConfidentialPortfolio />
        <ConfidentialTokenUtilityPanel />
      </div>

      <div className="grid">
        <InvestorDashboardGate
          featureName="On-Chain Data Insights"
          utility="Access control: aggregate investor analytics are available only after this wallet holds confidential cAAPL."
        >
          <OnChainDataInsightsPanel />
        </InvestorDashboardGate>
        <InvestorDashboardGate
          featureName="Smart Contract Auditor"
          utility="Access control: holder-only due diligence for confidential stock positions and collateral risk."
        >
          <SmartContractAuditorWidget />
        </InvestorDashboardGate>
        <InvestorDashboardGate
          featureName="Web3 LLM Assistant"
          utility="Rewards and in-app currency: holder-only guidance for private payments, collateral, dividends, and VIP tiers."
        >
          <Web3LLMAssistant />
        </InvestorDashboardGate>
      </div>
    </main>
  );
}
