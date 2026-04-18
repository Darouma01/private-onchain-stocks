import { ConfidentialTokenUtilityPanel } from "@/components/ConfidentialTokenUtilityPanel";
import { PublicAiToolsSection } from "@/components/ai/PublicAiToolsSection";
import { KycStatusCard } from "@/components/KycStatusCard";
import { LandingFooter } from "@/components/LandingFooter";
import { LandingHero } from "@/components/LandingHero";
import { MultiAssetProtocolDashboard } from "@/components/MultiAssetProtocolDashboard";
import { WalletPanel } from "@/components/WalletPanel";

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

      <div id="portfolio-utilities">
        <ConfidentialTokenUtilityPanel />
      </div>

      <PublicAiToolsSection />

      <LandingFooter />
    </main>
  );
}
