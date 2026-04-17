"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AssetCategory } from "@/deploy/assets.config";
import {
  assetDeployment,
  categoryLabels,
  deployedAssetCategories,
  deployedAssets,
  moduleAddresses,
  type DeployedAsset,
} from "@/lib/deployed-assets";
import {
  addressUrl,
  baseAssetAbi,
  confidentialWrapperAbi,
  deployedNoxExecutorAddress,
  shortAddress,
  txUrl,
} from "@/lib/contracts";

type Tab = "Markets" | "Portfolio" | "Trade" | "Dividends" | "Governance" | "Collateral" | "AI Tools";
type MarketSortKey = "symbol" | "name" | "category" | "price" | "change" | "kyc";
type SortDirection = "asc" | "desc";

type ActionState = {
  label: string;
  hash?: `0x${string}`;
  error?: string;
};

type PortfolioHolding = {
  asset: DeployedAsset;
  balance: number;
  value: number;
  pnl: number;
};

const tabs: Tab[] = ["Markets", "Portfolio", "Trade", "Dividends", "Governance", "Collateral", "AI Tools"];
const categoryPills: Array<{ value: AssetCategory | "ALL"; label: string; icon: string }> = [
  { value: "ALL", label: "All", icon: "61" },
  { value: AssetCategory.STOCK_US, label: "US Stocks", icon: "🇺🇸" },
  { value: AssetCategory.STOCK_INTL, label: "International", icon: "🌍" },
  { value: AssetCategory.CRYPTO, label: "Crypto", icon: "🪙" },
  { value: AssetCategory.COMMODITY, label: "Commodities", icon: "🏗️" },
  { value: AssetCategory.STABLECOIN, label: "Stablecoins", icon: "💵" },
];

export function MultiAssetProtocolDashboard() {
  const [tab, setTab] = useState<Tab>("Markets");
  const [category, setCategory] = useState<AssetCategory | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("cAAPL");

  const selectedAsset = deployedAssets.find((asset) => asset.symbol === selectedSymbol) ?? deployedAssets[0];
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return deployedAssets.filter((asset) => {
      const matchesCategory = category === "ALL" || asset.category === category;
      const matchesQuery =
        normalized.length === 0 ||
        asset.symbol.toLowerCase().includes(normalized) ||
        asset.name.toLowerCase().includes(normalized) ||
        asset.country?.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const categoryCounts = useMemo(() => {
    return deployedAssetCategories.map((item) => ({
      category: item,
      count: deployedAssets.filter((asset) => asset.category === item).length,
    }));
  }, []);

  return (
    <section className="section multi-asset-section">
      <div className="row">
        <div>
          <h2>61 Deployed Confidential Assets</h2>
          <p className="muted">
            Every listed market has a base ERC-3643-style asset and an ERC-7984-style confidential wrapper on Arbitrum
            Sepolia.
          </p>
        </div>
        <span className="status-dot good">{assetDeployment.selectedSymbols.length} live assets</span>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span className="muted">Asset Registry</span>
          <strong className="handle-text">{shortAddress(moduleAddresses.AssetRegistry)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Wrapper Factory</span>
          <strong className="handle-text">{shortAddress(moduleAddresses.ConfidentialWrapperFactory)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Nox Adapter</span>
          <strong className="handle-text">{shortAddress(moduleAddresses.NoxExecutor)}</strong>
        </div>
      </div>

      <div className="tab-row" role="tablist" aria-label="Protocol sections">
        {tabs.map((item) => (
          <button
            className={item === tab ? "tab active" : "tab"}
            key={item}
            onClick={() => setTab(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Markets" ? (
        <MarketsTab
          category={category}
          categoryCounts={categoryCounts}
          filteredAssets={filteredAssets}
          query={query}
          selectedSymbol={selectedSymbol}
          setCategory={setCategory}
          setQuery={setQuery}
          setSelectedSymbol={setSelectedSymbol}
          selectedAsset={selectedAsset}
        />
      ) : null}
      {tab === "Portfolio" ? <PortfolioTab selectedAsset={selectedAsset} /> : null}
      {tab === "Trade" ? <TradeTab selectedAsset={selectedAsset} setSelectedSymbol={setSelectedSymbol} /> : null}
      {tab === "Dividends" ? <DividendsTab selectedAsset={selectedAsset} /> : null}
      {tab === "Governance" ? <GovernanceTab selectedAsset={selectedAsset} /> : null}
      {tab === "Collateral" ? <CollateralTab selectedAsset={selectedAsset} /> : null}
      {tab === "AI Tools" ? <AiToolsTab selectedAsset={selectedAsset} /> : null}
    </section>
  );
}

function MarketsTab({
  category,
  categoryCounts,
  filteredAssets,
  query,
  selectedSymbol,
  selectedAsset,
  setCategory,
  setQuery,
  setSelectedSymbol,
}: {
  category: AssetCategory | "ALL";
  categoryCounts: Array<{ category: AssetCategory; count: number }>;
  filteredAssets: DeployedAsset[];
  query: string;
  selectedSymbol: string;
  selectedAsset: DeployedAsset;
  setCategory: (category: AssetCategory | "ALL") => void;
  setQuery: (query: string) => void;
  setSelectedSymbol: (symbol: string) => void;
}) {
  const [sortKey, setSortKey] = useState<MarketSortKey>("symbol");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [detailAsset, setDetailAsset] = useState<DeployedAsset | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("private-stocks:favorites");
      if (stored) setFavorites(JSON.parse(stored) as string[]);
    } catch {
      setFavorites([]);
    }
  }, []);

  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((left, right) => {
      const leftMarket = marketDisplay(left);
      const rightMarket = marketDisplay(right);
      const direction = sortDirection === "asc" ? 1 : -1;
      const compareText = (a: string, b: string) => a.localeCompare(b) * direction;

      if (sortKey === "price") return (leftMarket.price - rightMarket.price) * direction;
      if (sortKey === "change") return (leftMarket.change - rightMarket.change) * direction;
      if (sortKey === "kyc") return (Number(left.requiresKYC) - Number(right.requiresKYC)) * direction;
      if (sortKey === "category") return compareText(categoryLabels[left.category], categoryLabels[right.category]);
      if (sortKey === "name") return compareText(left.name, right.name);
      return compareText(left.symbol, right.symbol);
    });
  }, [filteredAssets, sortDirection, sortKey]);

  function countForCategory(item: AssetCategory | "ALL") {
    if (item === "ALL") return deployedAssets.length;
    return categoryCounts.find((entry) => entry.category === item)?.count ?? 0;
  }

  function toggleFavorite(symbol: string) {
    setFavorites((current) => {
      const next = current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol];
      window.localStorage.setItem("private-stocks:favorites", JSON.stringify(next));
      return next;
    });
  }

  function changeSort(nextKey: MarketSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "price" || nextKey === "change" ? "desc" : "asc");
  }

  return (
    <div className="stack">
      <div className="market-overview-grid">
        <MarketStat label="Total assets" value="61" change="+61 live" tone="good" />
        <MarketStat label="Total categories" value="5" change="Full registry" tone="neutral" />
        <MarketStat label="Protocol TVL" value="Encrypted" change="TEE gated" tone="private" />
        <MarketStat label="24h volume" value="Private" change="Aggregate hidden" tone="private" />
        <MarketStat label="Active holders" value="Registry" change="Live checks" tone="good" />
      </div>

      <div className="market-toolbar">
        <input
          aria-label="Search deployed assets"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search symbol, name, or country"
          value={query}
        />
        <span className="market-result-count">{sortedAssets.length} markets</span>
      </div>

      <div className="market-pill-tabs" role="tablist" aria-label="Asset categories">
        {categoryPills.map((item) => (
          <button
            aria-selected={category === item.value}
            className={category === item.value ? "market-pill active" : "market-pill"}
            key={item.value}
            onClick={() => setCategory(item.value)}
            role="tab"
            type="button"
          >
            <span>{item.icon}</span>
            <strong>{item.label}</strong>
            <em>{countForCategory(item.value)}</em>
          </button>
        ))}
      </div>

      <div className="market-table-shell">
        <table className="market-table">
          <thead>
            <tr>
              <th>#</th>
              <SortableHeader active={sortKey === "symbol"} direction={sortDirection} label="Asset" onClick={() => changeSort("symbol")} />
              <SortableHeader active={sortKey === "name"} direction={sortDirection} label="Name" onClick={() => changeSort("name")} />
              <SortableHeader active={sortKey === "category"} direction={sortDirection} label="Category" onClick={() => changeSort("category")} />
              <SortableHeader active={sortKey === "price"} direction={sortDirection} label="Price" onClick={() => changeSort("price")} />
              <SortableHeader active={sortKey === "change"} direction={sortDirection} label="24h Change" onClick={() => changeSort("change")} />
              <th>7D</th>
              <SortableHeader active={sortKey === "kyc"} direction={sortDirection} label="KYC" onClick={() => changeSort("kyc")} />
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAssets.map((asset, index) => (
              <AssetTableRow
                asset={asset}
                favorite={favorites.includes(asset.symbol)}
                index={index + 1}
                isSelected={selectedSymbol === asset.symbol}
                key={asset.symbol}
                onDetails={() => setDetailAsset(asset)}
                onSelect={() => setSelectedSymbol(asset.symbol)}
                onToggleFavorite={() => toggleFavorite(asset.symbol)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AssetActionPanel asset={selectedAsset} />
      {detailAsset ? (
        <AssetDetailPanel
          asset={detailAsset}
          onClose={() => setDetailAsset(null)}
          onSelect={() => {
            setSelectedSymbol(detailAsset.symbol);
            setDetailAsset(null);
          }}
        />
      ) : null}
    </div>
  );
}

function MarketStat({ label, value, change, tone }: { label: string; value: string; change: string; tone: "good" | "neutral" | "private" }) {
  return (
    <div className={`market-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{change}</small>
    </div>
  );
}

function SortableHeader({
  active,
  direction,
  label,
  onClick,
}: {
  active: boolean;
  direction: SortDirection;
  label: string;
  onClick: () => void;
}) {
  return (
    <th>
      <button className={active ? "sort-header active" : "sort-header"} onClick={onClick} type="button">
        {label}
        <span>{active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

function AssetTableRow({
  asset,
  favorite,
  index,
  isSelected,
  onDetails,
  onSelect,
  onToggleFavorite,
}: {
  asset: DeployedAsset;
  favorite: boolean;
  index: number;
  isSelected: boolean;
  onDetails: () => void;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const market = marketDisplay(asset);
  return (
    <tr className={isSelected ? "selected" : undefined}>
      <td className="index-cell">{index}</td>
      <td>
        <div className="asset-cell">
          <button
            aria-label={favorite ? `Remove ${asset.symbol} from favorites` : `Add ${asset.symbol} to favorites`}
            className={favorite ? "favorite-star active" : "favorite-star"}
            onClick={onToggleFavorite}
            type="button"
          >
            {favorite ? "★" : "☆"}
          </button>
          <span className={`asset-token-icon ${market.tone}`}>{assetBadge(asset)}</span>
          <div>
            <strong>{asset.symbol}</strong>
            <small>{asset.country ?? "Global"}</small>
          </div>
        </div>
      </td>
      <td className="name-cell">{asset.name}</td>
      <td>
        <span className="category-chip">{categoryLabels[asset.category]}</span>
      </td>
      <td className="price-cell">{formatMarketPrice(market.price)}</td>
      <td>
        <span className={market.change >= 0 ? "change-up" : "change-down"}>
          {market.change >= 0 ? "▲" : "▼"} {Math.abs(market.change).toFixed(2)}%
        </span>
      </td>
      <td>
        <Sparkline values={market.sparkline} positive={market.change >= 0} />
      </td>
      <td>
        <span className={asset.requiresKYC ? "kyc-pill required" : "kyc-pill open"}>
          {asset.requiresKYC ? "KYC Required" : "Open"}
        </span>
      </td>
      <td>
        <span className="live-pill">Live 🟢</span>
      </td>
      <td>
        <div className="table-actions">
          <button onClick={onSelect} type="button">Wrap</button>
          <button className="secondary" onClick={onSelect} type="button">Trade</button>
          <button className="ghost-button" onClick={onDetails} type="button">Details</button>
        </div>
      </td>
    </tr>
  );
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 80;
      const y = 26 - ((value - min) / range) * 22;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" role="img" viewBox="0 0 80 30" aria-label="7 day price history">
      <polyline fill="none" points={points} stroke={positive ? "#10B981" : "#EF4444"} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function AssetDetailPanel({ asset, onClose, onSelect }: { asset: DeployedAsset; onClose: () => void; onSelect: () => void }) {
  const [chartRange, setChartRange] = useState<"1D" | "7D" | "30D">("7D");
  const market = marketDisplay(asset);
  const chartValues = chartRange === "1D" ? market.sparkline.slice(-6) : chartRange === "7D" ? market.sparkline : [...market.sparkline, ...market.sparkline].slice(0, 14);
  const chartData = chartValues.map((value, index) => ({ label: `${index + 1}`, value }));

  async function copyAddress(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="asset-drawer-overlay" role="dialog" aria-modal="true" aria-label={`${asset.symbol} asset details`}>
      <aside className="asset-drawer">
        <div className="drawer-header">
          <div className="asset-cell">
            <span className={`asset-token-icon large ${market.tone}`}>{assetBadge(asset)}</span>
            <div>
              <span className="muted">{asset.country ?? "Global"} · {categoryLabels[asset.category]}</span>
              <h3>{asset.symbol} · {asset.name}</h3>
            </div>
          </div>
          <button className="ghost-button close-button" onClick={onClose} type="button">Close</button>
        </div>

        <div className="drawer-price-row">
          <strong>{formatMarketPrice(market.price)}</strong>
          <span className={market.change >= 0 ? "change-up" : "change-down"}>
            {market.change >= 0 ? "▲" : "▼"} {Math.abs(market.change).toFixed(2)}%
          </span>
        </div>

        <div className="range-tabs">
          {(["1D", "7D", "30D"] as const).map((item) => (
            <button className={chartRange === item ? "active" : undefined} key={item} onClick={() => setChartRange(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <div className="drawer-chart">
          <ResponsiveContainer height={180} width="100%">
            <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 12, top: 10 }}>
              <XAxis dataKey="label" hide />
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Tooltip
                contentStyle={{ background: "#111318", border: "1px solid #2A2D3A", borderRadius: 8, color: "#F8FAFC" }}
                formatter={(value) => [formatMarketPrice(Number(value)), asset.symbol]}
                labelFormatter={() => chartRange}
              />
              <Line
                dataKey="value"
                dot={false}
                isAnimationActive={false}
                stroke={market.change >= 0 ? "#10B981" : "#EF4444"}
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="drawer-section">
          <strong>Contract addresses</strong>
          <div className="copy-row">
            <span>Base</span>
            <code>{shortAddress(asset.baseAddress)}</code>
            <button className="secondary" onClick={() => void copyAddress(asset.baseAddress)} type="button">Copy</button>
            <a href={addressUrl(asset.baseAddress)} rel="noreferrer" target="_blank">Arbiscan</a>
          </div>
          <div className="copy-row">
            <span>Wrapper</span>
            <code>{shortAddress(asset.wrapperAddress)}</code>
            <button className="secondary" onClick={() => void copyAddress(asset.wrapperAddress)} type="button">Copy</button>
            <a href={addressUrl(asset.wrapperAddress)} rel="noreferrer" target="_blank">Arbiscan</a>
          </div>
        </div>

        <div className="drawer-section">
          <strong>KYC requirement</strong>
          <p className="muted">{asset.requiresKYC ? asset.complianceNotes : "This market is open for wrapping and confidential transfer without KYC gating."}</p>
        </div>

        <div className="drawer-actions">
          <button onClick={onSelect} type="button">Wrap this asset</button>
          <a className="button-link" href={addressUrl(asset.wrapperAddress)} rel="noreferrer" target="_blank">View on Arbiscan</a>
        </div>
      </aside>
    </div>
  );
}

function PortfolioTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  const [revealedAll, setRevealedAll] = useState(false);
  const [revealedRows, setRevealedRows] = useState<string[]>([]);
  const [range, setRange] = useState<"7D" | "30D" | "ALL">("7D");
  const [tiersOpen, setTiersOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const holdings = useMemo(() => portfolioHoldings(), []);
  const totalValue = holdings.reduce((total, item) => total + item.value, 0);
  const totalChange = holdings.reduce((total, item) => total + item.pnl, 0);
  const chartData = portfolioChartData(range, totalValue);
  const allocation = portfolioAllocation(holdings);

  function isRowRevealed(symbol: string) {
    return revealedAll || revealedRows.includes(symbol);
  }

  function toggleRow(symbol: string) {
    setRevealedRows((current) => (current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol]));
  }

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, []);

  return (
    <div className="portfolio-dashboard">
      <section className="portfolio-hero">
        <div>
          <span className="muted">Total Portfolio Value</span>
          <strong>{revealedAll ? formatMarketPrice(totalValue) : "🔒 ••••••"}</strong>
          <p className={totalChange >= 0 ? "change-up" : "change-down"}>
            {revealedAll ? `${totalChange >= 0 ? "▲" : "▼"} ${formatMarketPrice(Math.abs(totalChange))} (${((totalChange / totalValue) * 100).toFixed(2)}%)` : "🔒 24h change hidden"}
          </p>
        </div>
        <div className="portfolio-hero-actions">
          <button onClick={() => setRevealedAll(true)} type="button">Reveal All</button>
          <button className="secondary" onClick={() => setRevealedAll(false)} type="button">Hide All</button>
          <span>Last updated {lastUpdated}</span>
        </div>
      </section>

      <section className="portfolio-chart-grid">
        <div className={revealedAll ? "portfolio-chart-card" : "portfolio-chart-card hidden"}>
          <div className="row">
            <div>
              <strong>Portfolio Value</strong>
              <p className="muted">Encrypted balances revealed through TEE disclosure.</p>
            </div>
            <div className="range-tabs compact">
              {(["7D", "30D", "ALL"] as const).map((item) => (
                <button className={range === item ? "active" : undefined} key={item} onClick={() => setRange(item)} type="button">
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="portfolio-chart-canvas">
            {!revealedAll ? <div className="chart-hidden-overlay">🔒 Chart Hidden</div> : null}
            <ResponsiveContainer height={240} width="100%">
              <LineChart data={chartData} margin={{ bottom: 12, left: 0, right: 16, top: 16 }}>
                <XAxis dataKey="label" stroke="#475569" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  contentStyle={{ background: "#111318", border: "1px solid #2A2D3A", borderRadius: 8, color: "#F8FAFC" }}
                  formatter={(value) => [formatMarketPrice(Number(value)), "Value"]}
                />
                <Line dataKey="value" dot={false} isAnimationActive={false} stroke="#10B981" strokeWidth={3} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="portfolio-chart-card allocation-card">
          <div>
            <strong>Asset Allocation</strong>
            <p className="muted">Category percentages stay visible; values remain encrypted until reveal.</p>
          </div>
          <div className="allocation-layout">
            <ResponsiveContainer height={230} width="100%">
              <PieChart>
                <Pie data={allocation} dataKey="percent" innerRadius={62} outerRadius={92} paddingAngle={3}>
                  {allocation.map((item) => (
                    <Cell fill={item.color} key={item.name} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="allocation-legend">
              {allocation.map((item) => (
                <div key={item.name}>
                  <span style={{ background: item.color }} />
                  <strong>{item.name}</strong>
                  <em>{item.percent.toFixed(1)}%</em>
                  <small>{revealedAll ? formatMarketPrice(item.value) : "🔒 Hidden"}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="portfolio-panel">
        <div className="row">
          <div>
            <strong>Confidential Holdings</strong>
            <p className="muted">Balances and values stay encrypted until the holder reveals them.</p>
          </div>
          <span className="status-dot neutral">{holdings.length} positions</span>
        </div>
        <div className="holdings-table-shell">
          <table className="holdings-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Name</th>
                <th>Balance</th>
                <th>Value</th>
                <th>24h P&amp;L</th>
                <th>Allocation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding) => (
                <PortfolioHoldingRow
                  holding={holding}
                  key={holding.asset.symbol}
                  revealed={isRowRevealed(holding.asset.symbol)}
                  totalValue={totalValue}
                  onToggleReveal={() => toggleRow(holding.asset.symbol)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="portfolio-lower-grid">
        <div className="tier-card">
          <div className="tier-card-header">
            <div>
              <span className="muted">Current tier</span>
              <strong>Tier 2 🥈 Premium</strong>
            </div>
            <span className="tier-badge">Encrypted threshold</span>
          </div>
          <div className="tier-progress">
            <span style={{ width: "68%" }} />
          </div>
          <p className="muted">X more tokens needed for Tier 3 without revealing your current balance.</p>
          <div className="tier-checklist">
            <span>✓ Confidential transfers</span>
            <span>✓ Dividend reveal access</span>
            <span>✓ Collateral proof requests</span>
            <span className="locked">□ Institutional data room</span>
          </div>
          <button className="ghost-button" onClick={() => setTiersOpen((current) => !current)} type="button">
            How tiers work
          </button>
          {tiersOpen ? (
            <p className="tier-explainer">
              Nox verifies encrypted portfolio thresholds and returns only a tier result. The dashboard never needs to
              expose exact token balances to unlock features.
            </p>
          ) : null}
        </div>

        <div className="activity-card">
          <div>
            <strong>Recent Activity</strong>
            <p className="muted">Amounts remain hidden unless individually revealed.</p>
          </div>
          <div className="activity-feed">
            {portfolioActivity().map((item) => (
              <div className="activity-item" key={item.label}>
                <span className={item.tone} />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.time} · Amount 🔒</small>
                </div>
                <a href={txUrl(item.hash)} rel="noreferrer" target="_blank">Arbiscan</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AssetActionPanel asset={selectedAsset} />
    </div>
  );
}

function PortfolioHoldingRow({
  holding,
  revealed,
  totalValue,
  onToggleReveal,
}: {
  holding: PortfolioHolding;
  revealed: boolean;
  totalValue: number;
  onToggleReveal: () => void;
}) {
  const allocation = (holding.value / totalValue) * 100;
  return (
    <tr>
      <td>
        <div className="asset-cell">
          <span className={`asset-token-icon ${marketDisplay(holding.asset).tone}`}>{assetBadge(holding.asset)}</span>
          <strong>{holding.asset.symbol}</strong>
        </div>
      </td>
      <td className="name-cell">{holding.asset.name}</td>
      <td>
        <div className="hidden-value-cell">
          <span>{revealed ? `${holding.balance.toFixed(2)} ${holding.asset.symbol}` : "🔒 ••••"}</span>
          <button className="ghost-button" onClick={onToggleReveal} type="button">{revealed ? "Hide" : "Reveal"}</button>
        </div>
      </td>
      <td className="price-cell">{revealed ? formatMarketPrice(holding.value) : "🔒 Hidden"}</td>
      <td>
        <span className={holding.pnl >= 0 ? "change-up" : "change-down"}>
          {holding.pnl >= 0 ? "▲" : "▼"} {formatMarketPrice(Math.abs(holding.pnl))}
        </span>
      </td>
      <td>
        <div className="row-allocation">
          <svg viewBox="0 0 36 36" aria-label={`${allocation.toFixed(1)} percent allocation`}>
            <circle cx="18" cy="18" fill="none" r="15" stroke="#2A2D3A" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              fill="none"
              r="15"
              stroke="#6366F1"
              strokeDasharray={`${allocation} ${100 - allocation}`}
              strokeLinecap="round"
              strokeWidth="4"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span>{allocation.toFixed(1)}%</span>
        </div>
      </td>
      <td>
        <div className="table-actions">
          <button type="button">Transfer</button>
          <button className="secondary" type="button">Unwrap</button>
          <button className="ghost-button" type="button">Use as Collateral</button>
        </div>
      </td>
    </tr>
  );
}

function TradeTab({
  selectedAsset,
  setSelectedSymbol,
}: {
  selectedAsset: DeployedAsset;
  setSelectedSymbol: (symbol: string) => void;
}) {
  return (
    <div className="stack">
      <div className="action-panel">
        <div>
          <strong>Select active asset</strong>
          <p className="muted">Choose any deployed asset, then approve, wrap, and privately transfer it below.</p>
        </div>
        <select onChange={(event) => setSelectedSymbol(event.target.value)} value={selectedAsset.symbol}>
          {deployedAssets.map((asset) => (
            <option key={asset.symbol} value={asset.symbol}>
              {asset.symbol} - {asset.name}
            </option>
          ))}
        </select>
      </div>
      <AssetActionPanel asset={selectedAsset} />
      <div className="utility-layout">
        <SelectedAssetPanel asset={selectedAsset} label="From asset" />
        <div className="action-panel">
          <strong>Cross-asset confidential trade</strong>
          <p className="muted">
            Use encrypted amount handles for both legs. The wrapper emits asset/from/to metadata but never plaintext
            amounts.
          </p>
          <div className="metric-grid">
            <div className="metric">
              <span className="muted">Settlement asset</span>
              <strong>cUSDC</strong>
            </div>
            <div className="metric">
              <span className="muted">Trade privacy</span>
              <strong>Encrypted</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetActionPanel({ asset }: { asset: DeployedAsset }) {
  const { address, isConnected } = useAccount();
  const [wrapAmount, setWrapAmount] = useState("10");
  const [transferAmount, setTransferAmount] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [action, setAction] = useState<ActionState | null>(null);
  const { writeContractAsync } = useWriteContract();

  const standardBalance = useReadContract({
    address: asset.baseAddress,
    abi: baseAssetAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const allowance = useReadContract({
    address: asset.baseAddress,
    abi: baseAssetAbi,
    functionName: "allowance",
    args: address ? [address, asset.wrapperAddress] : undefined,
    query: { enabled: Boolean(address) },
  });

  const encryptedBalance = useReadContract({
    address: asset.wrapperAddress,
    abi: confidentialWrapperAbi,
    functionName: "getEncryptedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const wait = useWaitForTransactionReceipt({
    hash: action?.hash,
    query: { enabled: Boolean(action?.hash) },
  });

  const wrapAmountWei = useMemo(() => safeParseEther(wrapAmount), [wrapAmount]);
  const transferAmountWei = useMemo(() => safeParseEther(transferAmount), [transferAmount]);
  const hasEncryptedBalance = Boolean(
    encryptedBalance.data &&
      encryptedBalance.data !== "0x0000000000000000000000000000000000000000000000000000000000000000",
  );

  async function refresh() {
    await Promise.all([standardBalance.refetch(), allowance.refetch(), encryptedBalance.refetch()]);
  }

  async function approve(event: FormEvent) {
    event.preventDefault();
    if (!wrapAmountWei) {
      setAction({ label: "Approval needs attention", error: "Enter an amount greater than zero." });
      return;
    }
    try {
      setAction({ label: `Approving ${asset.symbol} wrapper...` });
      const hash = await writeContractAsync({
        address: asset.baseAddress,
        abi: baseAssetAbi,
        functionName: "approve",
        args: [asset.wrapperAddress, wrapAmountWei],
      });
      setAction({ label: `${asset.symbol} approval submitted`, hash });
      await refresh();
    } catch (caught) {
      setAction({ label: "Approval failed", error: errorMessage(caught) });
    }
  }

  async function wrap(event: FormEvent) {
    event.preventDefault();
    if (!wrapAmountWei) {
      setAction({ label: "Wrap needs attention", error: "Enter an amount greater than zero." });
      return;
    }
    try {
      if ((allowance.data ?? 0n) < wrapAmountWei) {
        setAction({ label: "Approval required", error: `Approve the ${asset.symbol} wrapper before wrapping this amount.` });
        return;
      }
      setAction({ label: `Wrapping ${asset.symbol} into its confidential wrapper...` });
      const hash = await writeContractAsync({
        address: asset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "wrap",
        args: [wrapAmountWei, "0x"],
      });
      setAction({ label: `${asset.symbol} wrap submitted`, hash });
      await refresh();
    } catch (caught) {
      setAction({ label: "Wrap failed", error: errorMessage(caught) });
    }
  }

  async function transfer(event: FormEvent) {
    event.preventDefault();
    if (!transferAmountWei || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setAction({ label: "Transfer needs attention", error: "Enter a valid recipient and amount greater than zero." });
      return;
    }
    try {
      setAction({ label: `Creating encrypted ${asset.symbol} transfer handle...` });
      const response = await fetch("/api/demo/create-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: transferAmountWei.toString(), noxAddress: deployedNoxExecutorAddress }),
      });
      const payload = (await response.json()) as { handle?: `0x${string}`; transactionHash?: `0x${string}`; error?: string };
      if (!response.ok || !payload.handle) {
        throw new Error(payload.error ?? "Unable to create encrypted amount handle");
      }

      setAction({ label: "Encrypted amount handle created", hash: payload.transactionHash });
      const hash = await writeContractAsync({
        address: asset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "confidentialTransfer",
        args: [recipient as `0x${string}`, payload.handle, "0x"],
      });
      setAction({ label: `${asset.symbol} confidential transfer submitted`, hash });
      await refresh();
    } catch (caught) {
      setAction({ label: "Confidential transfer failed", error: errorMessage(caught) });
    }
  }

  if (!isConnected) {
    return (
      <div className="action-panel">
        <strong>Connect wallet to use {asset.symbol}</strong>
        <p className="muted">After connecting, you can approve, wrap, and privately transfer this deployed asset.</p>
      </div>
    );
  }

  return (
    <div className="action-panel">
      <div className="row">
        <div>
          <strong>Use {asset.symbol}</strong>
          <p className="muted">
            Approve the base asset, wrap into {asset.wrapperAddress ? "the confidential wrapper" : "confidential form"},
            then transfer encrypted amounts.
          </p>
        </div>
        <span className={hasEncryptedBalance ? "status-dot good" : "status-dot neutral"}>
          {hasEncryptedBalance ? "Wrapped" : "Not wrapped"}
        </span>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span className="muted">Base balance</span>
          <strong>{standardBalance.data === undefined ? "..." : `${formatEther(standardBalance.data)} ${asset.symbol}`}</strong>
        </div>
        <div className="metric">
          <span className="muted">Approved amount</span>
          <strong>{allowance.data === undefined ? "..." : formatEther(allowance.data)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Encrypted balance handle</span>
          <strong className="handle-text">
            {hasEncryptedBalance && encryptedBalance.data ? `${encryptedBalance.data.slice(0, 10)}...` : "None"}
          </strong>
        </div>
      </div>

      <form className="inline-action-grid" onSubmit={approve}>
        <input
          aria-label={`Amount of ${asset.symbol} to approve or wrap`}
          inputMode="decimal"
          onChange={(event) => setWrapAmount(event.target.value)}
          value={wrapAmount}
        />
        <button disabled={!wrapAmountWei} type="submit">
          Approve
        </button>
        <button disabled={!wrapAmountWei} onClick={(event) => void wrap(event)} type="button">
          Wrap
        </button>
      </form>

      <form className="transfer-grid" onSubmit={transfer}>
        <input
          aria-label="Confidential transfer recipient"
          onChange={(event) => setRecipient(event.target.value)}
          placeholder="Recipient wallet"
          value={recipient}
        />
        <input
          aria-label={`Encrypted ${asset.symbol} transfer amount`}
          inputMode="decimal"
          onChange={(event) => setTransferAmount(event.target.value)}
          value={transferAmount}
        />
        <button disabled={!transferAmountWei || !hasEncryptedBalance} type="submit">
          Transfer Privately
        </button>
      </form>

      <ActionFeedback action={action} pending={wait.isLoading} confirmed={wait.isSuccess} />
    </div>
  );
}

function ActionFeedback({ action, pending, confirmed }: { action: ActionState | null; pending: boolean; confirmed: boolean }) {
  if (!action) return null;
  return (
    <div className={`feedback ${action.error ? "bad" : confirmed ? "good" : "neutral"}`}>
      <strong>{pending ? "Waiting for confirmation..." : action.label}</strong>
      {action.error ? <p>{action.error}</p> : null}
      {action.hash ? (
        <a href={txUrl(action.hash)} target="_blank" rel="noreferrer">
          View transaction on Arbiscan
        </a>
      ) : null}
    </div>
  );
}

function DividendsTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  const enabled = selectedAsset.category !== AssetCategory.COMMODITY;
  return (
    <div className="utility-layout">
      <SelectedAssetPanel asset={selectedAsset} label="Reward asset" />
      <UtilityBlock
        title={enabled ? "Confidential rewards enabled" : "Commodity rewards disabled"}
        text={
          enabled
            ? "Distributions update encrypted holder balances and emit holder/distribution metadata without public reward amounts."
            : "Commodity assets are excluded from dividend distributions by the confidential wrapper."
        }
      />
    </div>
  );
}

function GovernanceTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  return (
    <div className="utility-layout">
      <SelectedAssetPanel asset={selectedAsset} label="Voting asset" />
      <UtilityBlock
        title="Private voting"
        text="Proposal votes use encrypted vote and encrypted weight payloads. The interface shows participation without exposing voting power."
      />
      <UtilityBlock
        title="Protocol-wide proposals"
        text="Affected asset lists can include one asset or all 61 wrappers for protocol-wide governance decisions."
      />
    </div>
  );
}

function CollateralTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  return (
    <div className="utility-layout">
      <SelectedAssetPanel asset={selectedAsset} label="Collateral asset" />
      <UtilityBlock
        title="Confidential collateral proof"
        text="The Nox adapter returns a sufficiency proof for DeFi integrations without revealing the holder's exact balance."
      />
      <UtilityBlock
        title="Borrow assets"
        text="Preferred loan assets are cUSDC, cUSDT, cDAI, and cEURC. Collateral can mix any deployed confidential asset."
      />
    </div>
  );
}

function AiToolsTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  return (
    <div className="utility-layout">
      <SelectedAssetPanel asset={selectedAsset} label="AI context asset" />
      <UtilityBlock
        title="Smart Contract Auditor"
        text="The auditor can inspect the deployed base token or confidential wrapper address for any selected asset."
      />
      <UtilityBlock
        title="On-chain Insights"
        text="Insights should stay aggregate-only: supply, holder count, modules, and transfer activity without individual confidential balances."
      />
    </div>
  );
}

function SelectedAssetPanel({ asset, label }: { asset: DeployedAsset; label: string }) {
  return (
    <div className="action-panel">
      <div>
        <span className="muted">{label}</span>
        <strong>
          {asset.symbol} · {asset.name}
        </strong>
      </div>
      <p className="muted">{asset.complianceNotes}</p>
      <div className="address-pair">
        <a href={addressUrl(asset.baseAddress)} rel="noreferrer" target="_blank">
          Base contract {shortAddress(asset.baseAddress)}
        </a>
        <a href={addressUrl(asset.wrapperAddress)} rel="noreferrer" target="_blank">
          Confidential wrapper {shortAddress(asset.wrapperAddress)}
        </a>
      </div>
    </div>
  );
}

function UtilityBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="action-panel">
      <strong>{title}</strong>
      <p className="muted">{text}</p>
    </div>
  );
}

function portfolioHoldings(): PortfolioHolding[] {
  const symbols = ["cAAPL", "cTSLA", "cBTC", "cETH", "cGOLD", "cUSDC", "cNVDA", "cASML", "cOIL", "cDAI"];
  return symbols
    .map((symbol, index) => {
      const asset = deployedAssets.find((item) => item.symbol === symbol);
      if (!asset) return null;
      const market = marketDisplay(asset);
      const balance = asset.category === AssetCategory.STABLECOIN ? 5000 + index * 350 : 4.25 + index * 1.7;
      const value = balance * market.price;
      const pnl = value * (market.change / 100);
      return { asset, balance, pnl, value };
    })
    .filter((item): item is PortfolioHolding => Boolean(item));
}

function portfolioChartData(range: "7D" | "30D" | "ALL", totalValue: number) {
  const points = range === "7D" ? 7 : range === "30D" ? 30 : 18;
  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin(index * 0.75) * totalValue * 0.018;
    const drift = totalValue * 0.11 * (index / Math.max(points - 1, 1));
    return {
      label: range === "ALL" ? `M${index + 1}` : `${index + 1}`,
      value: totalValue * 0.9 + wave + drift,
    };
  });
}

function portfolioAllocation(holdings: PortfolioHolding[]) {
  const colors: Record<AssetCategory, string> = {
    [AssetCategory.STOCK_US]: "#6366F1",
    [AssetCategory.STOCK_INTL]: "#06B6D4",
    [AssetCategory.CRYPTO]: "#10B981",
    [AssetCategory.COMMODITY]: "#F59E0B",
    [AssetCategory.STABLECOIN]: "#8B5CF6",
  };
  const total = holdings.reduce((sum, holding) => sum + holding.value, 0);
  return deployedAssetCategories.map((category) => {
    const value = holdings
      .filter((holding) => holding.asset.category === category)
      .reduce((sum, holding) => sum + holding.value, 0);
    return {
      color: colors[category],
      name: categoryLabels[category],
      percent: total > 0 ? (value / total) * 100 : 0,
      value,
    };
  });
}

function portfolioActivity() {
  const fallbackHash = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
  return [
    { hash: fallbackHash, label: "Wrapped cAAPL", time: "2h ago", tone: "activity-wrap" },
    { hash: fallbackHash, label: "Sent cBTC confidentially", time: "1d ago", tone: "activity-transfer" },
    { hash: fallbackHash, label: "Received cTSLA dividend", time: "3d ago", tone: "activity-dividend" },
    { hash: fallbackHash, label: "Locked cGOLD as collateral", time: "5d ago", tone: "activity-collateral" },
  ];
}

function marketDisplay(asset: DeployedAsset) {
  const index = deployedAssets.findIndex((item) => item.symbol === asset.symbol);
  const basePrice =
    asset.symbol === "cBTC"
      ? 67420
      : asset.symbol === "cETH"
        ? 3520
        : asset.symbol === "cGOLD" || asset.symbol === "cXAUT"
          ? 2348
          : asset.category === AssetCategory.STABLECOIN
            ? 1
            : asset.category === AssetCategory.CRYPTO
              ? 82 + index * 7.2
              : asset.category === AssetCategory.COMMODITY
                ? 42 + index * 3.1
                : 118 + index * 5.35;
  const change = Number((((index * 1.37) % 12) - 4.6).toFixed(2));
  const sparkline = Array.from({ length: 10 }, (_, point) => {
    const wave = Math.sin((point + index) * 0.82) * (basePrice * 0.015);
    const drift = (change / 100) * basePrice * (point / 9);
    return basePrice + wave + drift;
  });
  const tone =
    asset.category === AssetCategory.STOCK_US
      ? "us"
      : asset.category === AssetCategory.STOCK_INTL
        ? "intl"
        : asset.category === AssetCategory.CRYPTO
          ? "crypto"
          : asset.category === AssetCategory.COMMODITY
            ? "commodity"
            : "stable";

  return { change, price: basePrice, sparkline, tone };
}

function formatMarketPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: value >= 100 ? 2 : 2,
    style: "currency",
  }).format(value);
}

function assetInitials(asset: DeployedAsset) {
  return asset.symbol.replace(/^c/, "").slice(0, 3).toUpperCase();
}

function assetBadge(asset: DeployedAsset) {
  if (asset.category === AssetCategory.STOCK_US) return "🇺🇸";
  if (asset.category === AssetCategory.STOCK_INTL) return countryFlag(asset.country) ?? "🌍";
  return assetInitials(asset);
}

function countryFlag(country?: string) {
  const flags: Record<string, string> = {
    AU: "🇦🇺",
    CH: "🇨🇭",
    CN: "🇨🇳",
    DE: "🇩🇪",
    DK: "🇩🇰",
    FR: "🇫🇷",
    HK: "🇭🇰",
    IN: "🇮🇳",
    JP: "🇯🇵",
    KR: "🇰🇷",
    NL: "🇳🇱",
    UK: "🇬🇧",
  };
  return country ? flags[country] : undefined;
}

function safeParseEther(value: string) {
  try {
    const parsed = parseEther(value);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Transaction failed";
}
