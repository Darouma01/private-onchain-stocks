"use client";

export function PortfolioHero({
  canRevealAll,
  isRevealingAll,
  lastUpdatedLabel,
  onHideAll,
  onRevealAll,
  revealedCount,
  totalHoldings,
  totalValue,
}: {
  canRevealAll: boolean;
  isRevealingAll: boolean;
  lastUpdatedLabel: string;
  onHideAll: () => void;
  onRevealAll: () => void;
  revealedCount: number;
  totalHoldings: number;
  totalValue: number | null;
}) {
  const subtitle =
    totalValue === null
      ? `🔒 Portfolio value hidden until reveal. ${revealedCount}/${totalHoldings} holdings revealed this session.`
      : `▲ ${formatUsd(totalValue)} across ${totalHoldings} confidential holdings.`;

  return (
    <section className="portfolio-hero">
      <div>
        <span className="muted">Total Portfolio Value</span>
        <strong>{totalValue === null ? "🔒 ••••••" : formatUsd(totalValue)}</strong>
        <p className={totalValue === null ? "" : "change-up"}>{subtitle}</p>
      </div>
      <div className="portfolio-hero-actions">
        <button disabled={!canRevealAll || isRevealingAll} onClick={onRevealAll} type="button">
          {isRevealingAll ? "Revealing..." : "Reveal All"}
        </button>
        <button className="secondary" onClick={onHideAll} type="button">
          Hide All
        </button>
        <span>Last updated {lastUpdatedLabel}</span>
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
