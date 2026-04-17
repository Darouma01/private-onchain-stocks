"use client";

import { deployedAssets } from "@/lib/deployed-assets";
import { usePrices } from "@/lib/prices/usePrices";

export function LandingHero() {
  const { prices } = usePrices();
  const heroTicker = deployedAssets.slice(0, 18).map((asset) => {
    const quote = prices[asset.symbol];
    const direction = (quote?.change24h ?? 0) >= 0 ? "up" : "down";
    return {
      change: quote ? `${direction === "up" ? "▲" : "▼"}${Math.abs(quote.change24h).toFixed(2)}%` : "⚠ unavailable",
      direction,
      price: quote ? formatHeroPrice(quote.price) : "Unavailable",
      symbol: asset.symbol,
    };
  });

  return (
    <section className="landing-hero">
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="hero-content">
        <span className="hero-eyebrow">Private Onchain Stocks</span>
        <h1>
          Trade Any Asset.
          <br />
          Completely Private.
        </h1>
        <p>
          61 confidential assets — stocks, crypto, commodities &amp; stablecoins — with encrypted balances powered by
          iExec Nox Protocol
        </p>
        <div className="hero-actions">
          <a className="hero-primary" href="#markets">Launch App →</a>
          <a className="hero-secondary" href="https://github.com/Darouma01/private-onchain-stocks" rel="noreferrer" target="_blank">
            View on GitHub
          </a>
        </div>
        <div className="hero-trust-row">
          <span>Powered by iExec Nox</span>
          <span>Supported by ChainGPT</span>
          <span>TUM Blockchain</span>
          <span>Deployed on Arbitrum</span>
        </div>
      </div>
      <div className="hero-ticker" aria-label="Sample asset ticker">
        <div>
          {[...heroTicker, ...heroTicker].map((item, index) => (
            <span className={item.direction === "up" ? "ticker-up" : "ticker-down"} key={`${item.symbol}-${index}`}>
              <strong>{item.symbol}</strong> {item.price} {item.change}
            </span>
          ))}
        </div>
      </div>
      <div className="hero-feature-grid">
        <article>
          <strong>🔒 Confidential by Design</strong>
          <p>Balances and transfers are encrypted on-chain using TEE technology</p>
        </article>
        <article>
          <strong>🌍 61 Global Assets</strong>
          <p>US stocks, international equities, crypto, commodities and stablecoins</p>
        </article>
        <article>
          <strong>⚡ DeFi Composable</strong>
          <p>Works with existing protocols — no wallet changes required</p>
        </article>
      </div>
    </section>
  );
}

function formatHeroPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: value >= 100 ? 2 : 2,
    style: "currency",
  }).format(value);
}
