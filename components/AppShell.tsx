import { ReactNode } from "react";
import { deployedAssets } from "@/lib/deployed-assets";

const navItems = [
  ["📊", "Markets"],
  ["💼", "Portfolio"],
  ["🔄", "Trade"],
  ["💰", "Dividends"],
  ["🗳️", "Governance"],
  ["🏦", "Collateral"],
  ["🤖", "AI Tools"],
  ["⚙️", "Settings"],
] as const;

const tickerAssets = deployedAssets.map((asset, index) => {
  const direction = index % 4 === 0 ? "down" : "up";
  const price = pseudoPrice(asset.symbol, index);
  const change = direction === "up" ? `▲${((index % 7) + 0.4).toFixed(1)}%` : `▼${((index % 5) + 0.3).toFixed(1)}%`;
  return { ...asset, change, direction, price };
});

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="terminal-shell">
      <header className="topbar">
        <div className="brand-lock">
          <span className="brand-icon">🔒</span>
          <span>Private Stocks</span>
        </div>
        <div className="network-pill">⬡ Arbitrum Sepolia</div>
        <nav className="top-actions" aria-label="Quick links">
          <a href="https://www.alchemy.com/faucets/arbitrum-sepolia" target="_blank" rel="noreferrer">
            Faucet
          </a>
          <a href="https://github.com/Darouma01/private-onchain-stocks" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://github.com/Darouma01/private-onchain-stocks/tree/main/docs" target="_blank" rel="noreferrer">
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
          <TickerItems />
          <TickerItems />
        </div>
      </div>
    </div>
  );
}

function TickerItems() {
  return (
    <div className="ticker-group">
      {tickerAssets.map((asset) => (
        <span className="ticker-item" key={`${asset.symbol}-${asset.direction}`}>
          <strong>{asset.symbol}</strong>
          <span>${asset.price}</span>
          <span className={asset.direction === "up" ? "ticker-up" : "ticker-down"}>{asset.change}</span>
        </span>
      ))}
    </div>
  );
}

function pseudoPrice(symbol: string, index: number) {
  if (symbol === "cBTC") return "67,420";
  if (symbol === "cETH") return "3,240";
  if (symbol === "cGOLD" || symbol === "cXAUT") return "2,348";
  if (symbol.includes("USDC") || symbol.includes("USDT") || symbol.includes("DAI")) return "1.00";
  return (94 + index * 7.13).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}
