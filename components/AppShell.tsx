"use client";

import { ReactNode } from "react";
import { deployedAssets } from "@/lib/deployed-assets";
import { usePrices } from "@/lib/prices/usePrices";
import { uiLinks } from "@/lib/ui-links";

const navItems = [
  ["📊", "Markets"],
  ["💼", "Portfolio"],
  ["🔄", "Trade"],
  ["💰", "Dividends"],
  ["🗳️", "Governance"],
  ["🏦", "Collateral"],
  ["🤖", "AI Tools"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const prices = usePrices();

  return (
    <div className="terminal-shell">
      <header className="topbar">
        <div className="brand-lock">
          <span className="brand-icon">🔒</span>
          <span>Private Stocks</span>
        </div>
        <div className="network-pill">⬡ Arbitrum Sepolia</div>
        <nav className="top-actions" aria-label="Quick links">
          <a href="https://cdefi.iex.ec/" target="_blank" rel="noreferrer">
            Faucet
          </a>
          <a href={uiLinks.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={uiLinks.demoVideo} target="_blank" rel="noreferrer">
            Demo Video
          </a>
          <a href={uiLinks.docs} target="_blank" rel="noreferrer">
            Docs
          </a>
          <span className="status-dot neutral">KYC</span>
          <span className="tier-badge">Tier 🔒</span>
          <a className="connect-anchor" href="#wallet">
            Connect Wallet
          </a>
        </nav>
      </header>

      <aside className="sidebar" aria-label="Protocol navigation">
        <nav className="sidebar-nav">
          {navItems.map(([icon, label]) => (
            <a href={`#${label.toLowerCase().replaceAll(" ", "-")}`} key={label}>
              <span aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="muted">Portfolio Value</span>
          <strong>🔒 Hidden</strong>
          <span className="tier-badge">Institutional Ready</span>
          <span className="kyc-indicator">KYC status: live check</span>
        </div>
      </aside>

      <div className="content-frame">{children}</div>

      <div className="ticker-bar" aria-label="Market ticker">
        <div className="ticker-track">
          <TickerItems prices={prices.prices} />
          <TickerItems prices={prices.prices} />
        </div>
      </div>
    </div>
  );
}

function TickerItems({ prices }: { prices: ReturnType<typeof usePrices>["prices"] }) {
  return (
    <div className="ticker-group">
      {deployedAssets.map((asset) => {
        const quote = prices[asset.symbol];
        const direction = (quote?.change24h ?? 0) >= 0 ? "up" : "down";
        return (
        <span className="ticker-item" key={`${asset.symbol}-${direction}`}>
          <strong>{asset.symbol}</strong>
          <span>{quote ? formatTickerPrice(quote.price) : "Unavailable"}</span>
          <span className={direction === "up" ? "ticker-up" : "ticker-down"}>
            {quote ? `${direction === "up" ? "▲" : "▼"}${Math.abs(quote.change24h).toFixed(2)}%` : "⚠"}
          </span>
        </span>
        );
      })}
    </div>
  );
}

function formatTickerPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: value >= 100 ? 2 : 2,
    style: "currency",
  }).format(value);
}
