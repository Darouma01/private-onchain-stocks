import { ConfidentialPortfolio } from "@/components/ConfidentialPortfolio";
import { ConfidentialTokenUtilityPanel } from "@/components/ConfidentialTokenUtilityPanel";
import { InvestorDashboardGate } from "@/components/InvestorDashboardGate";
import { KycStatusCard } from "@/components/KycStatusCard";
import { MultiAssetProtocolDashboard } from "@/components/MultiAssetProtocolDashboard";
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
          Trade and manage 61 deployed confidential assets across stocks, crypto, commodities, and stablecoins with
          encrypted balances, private payments, holder-gated access, confidential rewards, governance, and collateral.
        </p>
      </header>

      <div className="top-grid">
        <WalletPanel />
        <KycStatusCard />
      </div>

      <MultiAssetProtocolDashboard />

      <div className="primary-grid">
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
