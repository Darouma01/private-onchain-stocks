"use client";

export function PortfolioHero({
  canRevealAll,
  isHidden,
  isRevealingAll,
  lastUpdatedLabel,
  progressLabel,
  onHideAll,
  onRevealAll,
  totalHoldings,
  totalTier,
  totalValue,
}: {
  canRevealAll: boolean;
  isHidden: boolean;
  isRevealingAll: boolean;
  lastUpdatedLabel: string;
  progressLabel: string | null;
  onHideAll: () => void;
  onRevealAll: () => void;
  totalHoldings: number;
  totalTier: string;
  totalValue: number | null;
}) {
  return (
    <section className="portfolio-hero portfolio-summary-grid">
      <div className="portfolio-summary-card">
        <span className="muted">Assets Held</span>
        <strong>{totalHoldings}</strong>
        <p>{totalHoldings} assets confidential</p>
      </div>

      <div className="portfolio-summary-card">
        <span className="muted">Portfolio Value</span>
        <strong>{isHidden || totalValue === null ? "🔒 Hidden" : formatUsd(totalValue)}</strong>
        <div className="portfolio-hero-actions">
          <button disabled={!canRevealAll || isRevealingAll} onClick={onRevealAll} type="button">
            {isRevealingAll ? "Revealing..." : "Reveal All"}
          </button>
          {!isHidden ? (
            <button className="secondary" onClick={onHideAll} type="button">
              Hide All
            </button>
          ) : null}
        </div>
        <p>{progressLabel ?? `Last updated ${lastUpdatedLabel}`}</p>
      </div>

      <div className="portfolio-summary-card">
        <span className="muted">Your Tier</span>
        <strong>{totalTier}</strong>
        <p>{tierSubtitle(totalTier)}</p>
      </div>
    </section>
  );
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: 2,
  }).format(value);
}

function tierSubtitle(tier: string) {
  if (tier.includes("Elite")) return "Highest access tier";
  if (tier.includes("Institutional")) return "Institutional level";
  if (tier.includes("Premium")) return "Premium access";
  return "Basic confidential holder";
}
