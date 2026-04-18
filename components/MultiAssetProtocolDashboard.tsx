"use client";

import { FormEvent, type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AssetCategory } from "@/deploy/assets.config";
import { useAnyConfidentialBalance, useSelectedConfidentialBalance } from "@/components/useAnyConfidentialBalance";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";
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
import { erc20Abi } from "@/lib/onchain";
import { AddressDisplay, AssetSelector, ConfidentialBadge, EmptyState, KYCBadge, NetworkBadge, PriceDisplay, SkeletonRows, TierBadge } from "@/components/SharedUi";
import { getCachedAssetPrice, usePrices } from "@/lib/prices/usePrices";
import { getUtilityText } from "@/lib/utilities/getUtilityText";
import { SparklineChart } from "@/components/SparklineChart";

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

type GovernanceProposal = {
  assets: string[];
  deadline: string;
  execution: string;
  excerpt: string;
  forPct: number;
  participation: number;
  status: "Active" | "Closed" | "Passed" | "Failed";
  title: string;
  voters: number;
};

type SparklineState = {
  error: string | null;
  isLoading: boolean;
  sparklines: Record<string, number[]>;
};

type AiChatMessage = {
  role: "assistant" | "user";
  content: string;
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

export function MultiAssetProtocolDashboard({ initialTab = "Markets" }: { initialTab?: Tab } = {}) {
  const priceState = usePrices();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [category, setCategory] = useState<AssetCategory | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const { selectedAsset, selectedSymbol, setSelectedSymbol } = useSelectedAsset();

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

  useEffect(() => {
    const hashToTab: Record<string, Tab> = {
      "#ai-tools": "AI Tools",
      "#collateral": "Collateral",
      "#dividends": "Dividends",
      "#governance": "Governance",
      "#markets": "Markets",
      "#portfolio": "Portfolio",
      "#trade": "Trade",
    };
    function applyHash() {
      if (window.location.pathname === "/ai-tools") {
        setTab("AI Tools");
        return;
      }
      const nextTab = hashToTab[window.location.hash];
      if (nextTab) setTab(nextTab);
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <section className="section multi-asset-section" id="markets">
      <div className="row">
        <div>
          <h2>61 Deployed Confidential Assets</h2>
          <p className="muted">
            Every listed market has a base ERC-3643-style asset and an ERC-7984-style confidential wrapper on Arbitrum
            Sepolia.
          </p>
          <p className="muted">
            Prices: {priceState.isLoading ? "Loading live feeds..." : priceState.lastRefresh ? `Last updated ${formatRefreshAge(priceState.lastRefresh)}` : "Not loaded"}
            {priceState.error ? " · ⚠ Price data unavailable, showing last known values only" : ""}
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
            onClick={() => {
              setTab(item);
              window.history.replaceState(null, "", `#${item.toLowerCase().replaceAll(" ", "-")}`);
            }}
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
  const [sparklineState, setSparklineState] = useState<SparklineState>({
    error: null,
    isLoading: true,
    sparklines: {},
  });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("private-stocks:favorites");
      if (stored) setFavorites(JSON.parse(stored) as string[]);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSparklines() {
      try {
        const response = await fetch("/api/sparklines", { cache: "no-store" });
        const payload = (await response.json()) as {
          sparklines?: Record<string, { prices: number[]; symbol: string }>;
        };
        if (!response.ok) throw new Error("Sparkline data unavailable");
        if (cancelled) return;

        setSparklineState({
          error: null,
          isLoading: false,
          sparklines: Object.fromEntries(
            Object.entries(payload.sparklines ?? {}).map(([symbol, item]) => [symbol, item.prices]),
          ),
        });
      } catch (error) {
        if (cancelled) return;
        setSparklineState((current) => ({
          error: error instanceof Error ? error.message : "Sparkline data unavailable",
          isLoading: false,
          sparklines: current.sparklines,
        }));
      }
    }

    void loadSparklines();
    return () => {
      cancelled = true;
    };
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
        {sortedAssets.length === 0 ? (
          <EmptyState action="View Markets →" href="#markets" text="Try a different search term or category filter." title="No markets found" />
        ) : (
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
                  sparklineData={sparklineState.sparklines[asset.symbol]}
                  sparklineLoading={sparklineState.isLoading}
                />
              ))}
            </tbody>
          </table>
        )}
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
  sparklineData,
  sparklineLoading,
}: {
  asset: DeployedAsset;
  favorite: boolean;
  index: number;
  isSelected: boolean;
  onDetails: () => void;
  onSelect: () => void;
  onToggleFavorite: () => void;
  sparklineData?: number[];
  sparklineLoading: boolean;
}) {
  const market = marketDisplay(asset, sparklineData);
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
        {sparklineLoading ? <span className="sparkline-skeleton" aria-label="Loading 7 day price history" /> : <SparklineChart data={market.sparkline} positive={market.change >= 0} />}
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
          <a className="ghost-button" href={`/?asset=${encodeURIComponent(asset.symbol)}#portfolio-utilities`}>Use {asset.symbol}</a>
          <button className="ghost-button" onClick={onDetails} type="button">Details</button>
        </div>
      </td>
    </tr>
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
          {holdings.length === 0 ? (
            <EmptyState action="Go to Trade →" href="#trade" text="Wrap your first token to get started." title="No assets yet" />
          ) : <table className="holdings-table">
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
          </table>}
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
  const [tradeMode, setTradeMode] = useState<"Wrap" | "Unwrap" | "Transfer" | "Swap">("Wrap");
  const [chartRange, setChartRange] = useState<"1H" | "1D" | "7D" | "30D">("7D");
  const [amount, setAmount] = useState("10");
  const [recipient, setRecipient] = useState("");
  const [toSymbol, setToSymbol] = useState("cUSDC");
  const [slippage, setSlippage] = useState("0.5");
  const toAsset = deployedAssets.find((asset) => asset.symbol === toSymbol) ?? deployedAssets.find((asset) => asset.symbol === "cUSDC") ?? deployedAssets[0];
  const market = marketDisplay(selectedAsset);
  const toMarket = marketDisplay(toAsset);
  const chartData = tradeChartData(selectedAsset, chartRange);
  const exchangeRate = market.price / toMarket.price;
  const recipientValid = recipient.length === 0 || /^0x[a-fA-F0-9]{40}$/.test(recipient) || recipient.endsWith(".eth");
  const tradeTabs = ["Wrap", "Unwrap", "Transfer", "Swap"] as const;

  function reverseSwap() {
    setSelectedSymbol(toAsset.symbol);
    setToSymbol(selectedAsset.symbol);
  }

  return (
    <div className="trade-dashboard">
      <section className="trade-layout">
        <div className="trade-panel">
          <div className="trade-panel-tabs" role="tablist" aria-label="Trade mode">
            {tradeTabs.map((item) => (
              <button className={tradeMode === item ? "active" : undefined} key={item} onClick={() => setTradeMode(item)} type="button">
                {item}
              </button>
            ))}
          </div>

          {tradeMode === "Wrap" ? (
            <div className="trade-form-card">
              <TradeAssetSelect label="Asset" selectedSymbol={selectedAsset.symbol} onChange={setSelectedSymbol} />
              <div className="trade-amount-box">
                <label htmlFor="wrap-amount">Amount</label>
                <div>
                  <input id="wrap-amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
                  <button className="ghost-button" onClick={() => setAmount("100")} type="button">MAX</button>
                </div>
              </div>
              <div className="trade-info-grid">
                <span>KYC status</span>
                <strong className={selectedAsset.requiresKYC ? "kyc-warning" : "kyc-ok"}>
                  {selectedAsset.requiresKYC ? "❌ KYC required" : "✅ Open market"}
                </strong>
                <span>Price</span>
                <strong>1 {selectedAsset.symbol} = {formatMarketPrice(market.price)}</strong>
                <span>Estimated gas</span>
                <strong>~0.00008 ETH</strong>
              </div>
              <SkeletonRows rows={1} />
              <div className="privacy-notice">🔒 Your balance will be encrypted on-chain</div>
              <button disabled={selectedAsset.requiresKYC} type="button">Wrap to Confidential</button>
              <div className="trade-steps">
                <span className="active">Approve</span>
                <span>Wrap</span>
                <span>Confirmed 🔒</span>
              </div>
            </div>
          ) : null}

          {tradeMode === "Unwrap" ? (
            <div className="trade-form-card">
              <TradeAssetSelect label="Confidential asset" selectedSymbol={selectedAsset.symbol} onChange={setSelectedSymbol} holdingsOnly />
              <div className="encrypted-balance-card">
                <span>Encrypted balance</span>
                <strong>🔒 0x8f4a...c921</strong>
                <button className="ghost-button" type="button">Reveal</button>
              </div>
              <div className="trade-amount-box">
                <label htmlFor="unwrap-amount">Amount</label>
                <input id="unwrap-amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
              </div>
              <button type="button">Unwrap to Standard ERC-20</button>
            </div>
          ) : null}

          {tradeMode === "Transfer" ? (
            <div className="trade-form-card">
              <TradeAssetSelect label="Held asset" selectedSymbol={selectedAsset.symbol} onChange={setSelectedSymbol} holdingsOnly />
              <label className="trade-field">
                Recipient ENS or address
                <input
                  aria-invalid={!recipientValid}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="vitalik.eth or 0x..."
                  value={recipient}
                />
              </label>
              <div className={recipientValid ? "recipient-status ok" : "recipient-status bad"}>
                {recipientValid ? "Recipient format valid" : "Enter ENS or a valid 0x address"}
              </div>
              <div className="address-book-row">
                <button className="secondary" onClick={() => setRecipient("0x3CF9BfCD655Bed4A079a6d8a45686a4591c7d76c")} type="button">Demo Investor 1</button>
                <button className="secondary" onClick={() => setRecipient("0xEE3eA6f858aE84dD6959f241DfC257a2f8fA3f53")} type="button">Demo Investor 2</button>
              </div>
              <div className="trade-amount-box">
                <label htmlFor="transfer-amount">Encrypted amount</label>
                <input id="transfer-amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
              </div>
              <div className="privacy-notice">🔒 Amount hidden on-chain</div>
              <div className="recipient-status ok">Recipient KYC check: ✅ eligible for confidential transfer</div>
              <button disabled={!recipientValid || recipient.length === 0} type="button">Review Private Transfer</button>
            </div>
          ) : null}

          {tradeMode === "Swap" ? (
            <div className="trade-form-card">
              <TradeAssetSelect label="From" selectedSymbol={selectedAsset.symbol} onChange={setSelectedSymbol} />
              <button className="swap-reverse-button" onClick={reverseSwap} type="button">↓↑</button>
              <TradeAssetSelect label="To" selectedSymbol={toAsset.symbol} onChange={setToSymbol} />
              <div className="trade-info-grid">
                <span>Exchange rate</span>
                <strong>1 {selectedAsset.symbol} = {exchangeRate.toFixed(4)} {toAsset.symbol}</strong>
                <span>Price impact</span>
                <strong className="change-up">0.18%</strong>
              </div>
              <div className="slippage-row">
                <span>Slippage tolerance</span>
                {["0.1", "0.5", "1"].map((item) => (
                  <button className={slippage === item ? "active" : undefined} key={item} onClick={() => setSlippage(item)} type="button">
                    {item}%
                  </button>
                ))}
                <input aria-label="Custom slippage" onChange={(event) => setSlippage(event.target.value)} placeholder="Custom" value={["0.1", "0.5", "1"].includes(slippage) ? "" : slippage} />
              </div>
              <div className="privacy-notice">🔒 Trade executes privately inside TEE</div>
              <div className="quick-pairs">
                {[
                  ["cAAPL", "cUSDC"],
                  ["cBTC", "cETH"],
                  ["cGOLD", "cUSDT"],
                  ["cETH", "cUSDC"],
                ].map(([from, to]) => (
                  <button
                    className="secondary"
                    key={`${from}-${to}`}
                    onClick={() => {
                      setSelectedSymbol(from);
                      setToSymbol(to);
                    }}
                    type="button"
                  >
                    {from} → {to}
                  </button>
                ))}
              </div>
              <button type="button">Review Private Swap</button>
            </div>
          ) : null}

          <AssetActionPanel asset={selectedAsset} />
        </div>

        <aside className="trade-market-panel">
          <div className="trade-price-header">
            <div className="asset-cell">
              <span className={`asset-token-icon ${market.tone}`}>{assetBadge(selectedAsset)}</span>
              <div>
                <strong>{selectedAsset.symbol}</strong>
                <small>{selectedAsset.name}</small>
              </div>
            </div>
            <div>
              <strong>{formatMarketPrice(market.price)}</strong>
              <span className={market.change >= 0 ? "change-up" : "change-down"}>
                {market.change >= 0 ? "▲" : "▼"} {Math.abs(market.change).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="range-tabs compact">
            {(["1H", "1D", "7D", "30D"] as const).map((item) => (
              <button className={chartRange === item ? "active" : undefined} key={item} onClick={() => setChartRange(item)} type="button">
                {item}
              </button>
            ))}
          </div>
          <div className="trade-chart-card">
            <SkeletonRows rows={1} />
            <ResponsiveContainer height={250} width="100%">
              <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 12, top: 12 }}>
                <XAxis dataKey="label" hide />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  contentStyle={{ background: "#111318", border: "1px solid #2A2D3A", borderRadius: 8, color: "#F8FAFC" }}
                  formatter={(value) => [formatMarketPrice(Number(value)), selectedAsset.symbol]}
                  labelFormatter={() => chartRange}
                />
                <Line dataKey="price" dot={false} isAnimationActive={false} stroke={market.change >= 0 ? "#10B981" : "#EF4444"} strokeWidth={3} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-volume-card">
            <strong>Volume</strong>
            <ResponsiveContainer height={96} width="100%">
              <BarChart data={chartData}>
                <Bar dataKey="volume" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <RecentTradeHistory />
        </aside>
      </section>
    </div>
  );
}

function TradeAssetSelect({
  holdingsOnly,
  label,
  onChange,
  selectedSymbol,
}: {
  holdingsOnly?: boolean;
  label: string;
  onChange: (symbol: string) => void;
  selectedSymbol: string;
}) {
  const assets = holdingsOnly ? portfolioHoldings().map((holding) => holding.asset) : deployedAssets;
  return (
    <label className="trade-asset-select">
      {label}
      <select onChange={(event) => onChange(event.target.value)} value={selectedSymbol}>
        {deployedAssetCategories.map((category) => (
          <optgroup key={category} label={categoryLabels[category]}>
            {assets
              .filter((asset) => asset.category === category)
              .map((asset) => {
                const market = marketDisplay(asset);
                return (
                  <option key={asset.symbol} value={asset.symbol}>
                    {assetBadge(asset)} {asset.symbol} · {formatMarketPrice(market.price)} · {asset.requiresKYC ? "KYC" : "Open"}
                  </option>
                );
              })}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function RecentTradeHistory() {
  return (
    <div className="recent-trades-card">
      <div>
        <strong>Recent Trades</strong>
        <p className="muted">Wrap, unwrap, and transfer activity with encrypted amounts.</p>
      </div>
      {tradeHistory().map((item) => (
        <div className="recent-trade-row" key={`${item.action}-${item.time}`}>
          <span className={item.status.toLowerCase()}>{item.status}</span>
          <div>
            <strong>{item.action}</strong>
            <small>{item.time} · Amount 🔒</small>
          </div>
          <a href={txUrl(item.hash)} rel="noreferrer" target="_blank">Arbiscan</a>
        </div>
      ))}
    </div>
  );
}

function AssetActionPanel({ asset }: { asset: DeployedAsset }) {
  const { address, isConnected } = useAccount();
  const text = getUtilityText(asset);
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
        <strong>{text.connectPrompt}</strong>
        <p className="muted">{text.connectDescription}</p>
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
  const [rewardTab, setRewardTab] = useState<"stocks" | "crypto" | "stablecoins" | "commodities">("stocks");
  const [revealedRows, setRevealedRows] = useState<string[]>([]);
  const rows = dividendRows(rewardTab);
  const chartData = monthlyDistributionData();

  function toggleReveal(symbol: string) {
    setRevealedRows((current) => (current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol]));
  }

  return (
    <div className="rewards-dashboard">
      <section className="rewards-hero">
        <div className="reward-stat">
          <span>Total Unclaimed</span>
          <strong>🔒 Hidden</strong>
          <button className="ghost-button" type="button">Reveal All</button>
        </div>
        <div className="reward-stat">
          <span>Next Distribution</span>
          <strong>05d 14h 22m</strong>
          <small>Quarterly stock cycle</small>
        </div>
        <div className="reward-stat">
          <span>Your Eligible Assets</span>
          <strong>17 of 61</strong>
          <small>{selectedAsset.symbol} selected</small>
        </div>
        <button type="button">Claim All</button>
      </section>

      <div className="reward-tabs">
        {[
          ["stocks", "Stock Dividends"],
          ["crypto", "Crypto Rewards"],
          ["stablecoins", "Stablecoin Yield"],
          ["commodities", "Commodity (N/A)"],
        ].map(([value, label]) => (
          <button className={rewardTab === value ? "active" : undefined} key={value} onClick={() => setRewardTab(value as typeof rewardTab)} type="button">
            {label}
          </button>
        ))}
      </div>

      <section className="rewards-grid">
        <div className="rewards-table-card">
          <table className="rewards-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Period</th>
                <th>Distributed</th>
                <th>Your Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6}><EmptyState action="View Markets →" href="#markets" text="Hold confidential stocks or crypto to earn dividends." title="No eligible rewards" /></td></tr>
              ) : rows.map((row) => {
                const revealed = revealedRows.includes(row.asset.symbol) || row.status === "Claimed";
                return (
                  <tr key={`${row.asset.symbol}-${row.period}`}>
                    <td><div className="asset-cell"><span className={`asset-token-icon ${marketDisplay(row.asset).tone}`}>{assetBadge(row.asset)}</span><strong>{row.asset.symbol}</strong></div></td>
                    <td>{row.period}</td>
                    <td>{row.distributed}</td>
                    <td>
                      <div className="hidden-value-cell">
                        <span>{revealed ? row.amount : "🔒 Hidden"}</span>
                        {row.status !== "Claimed" ? <button className="ghost-button" onClick={() => toggleReveal(row.asset.symbol)} type="button">Reveal</button> : null}
                      </div>
                    </td>
                    <td><span className={`reward-status ${row.status.toLowerCase()}`}>{row.status}</span></td>
                    <td><button disabled={row.status !== "Claimable"} type="button">{row.status === "Claimable" ? "Claim" : row.status}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="distribution-chart-card">
          <div>
            <strong>Distribution History</strong>
            <p className="muted">Monthly rewards remain encrypted until reveal.</p>
          </div>
          <ResponsiveContainer height={260} width="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="month" stroke="#475569" tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid #2A2D3A", borderRadius: 8, color: "#F8FAFC" }} />
              <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function GovernanceTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  const [voteProposal, setVoteProposal] = useState<GovernanceProposal | null>(null);
  const [creating, setCreating] = useState(false);
  const proposals = governanceProposals();

  return (
    <div className="governance-dashboard">
      <section className="governance-hero">
        <div>
          <span className="muted">Active proposals</span>
          <strong>{proposals.filter((item) => item.status === "Active").length}</strong>
        </div>
        <div>
          <span className="muted">Your Voting Power</span>
          <strong>Active 🔒</strong>
        </div>
        <button className="secondary" type="button">Delegate</button>
        <button onClick={() => setCreating(true)} type="button">+ New Proposal</button>
      </section>

      <section className="proposal-grid">
        {proposals.length === 0 ? (
          <EmptyState action="Create Proposal" href="#governance" text="Be the first to create one." title="No active proposals" />
        ) : proposals.map((proposal) => (
          <article className="proposal-card" key={proposal.title}>
            <div className="proposal-topline">
              <span className={`proposal-status ${proposal.status.toLowerCase()}`}>{proposal.status}</span>
              <small>{proposal.deadline}</small>
            </div>
            <h3>{proposal.title}</h3>
            <p>{proposal.excerpt}</p>
            <div className="proposal-tags">
              {proposal.assets.map((asset) => <span key={asset}>{asset}</span>)}
            </div>
            <div className="proposal-meta">
              <span>{proposal.voters} voters</span>
              <span>{proposal.participation}% participation</span>
            </div>
            {proposal.status === "Active" ? (
              <button onClick={() => setVoteProposal(proposal)} type="button">Vote Now</button>
            ) : (
              <div className="results-card">
                <div className="result-bars">
                  <span style={{ width: `${proposal.forPct}%` }} />
                  <em style={{ width: `${100 - proposal.forPct}%` }} />
                </div>
                <small>For {proposal.forPct}% | Against {100 - proposal.forPct}% · {proposal.execution}</small>
              </div>
            )}
          </article>
        ))}
      </section>

      {voteProposal ? <VotingModal proposal={voteProposal} onClose={() => setVoteProposal(null)} /> : null}
      {creating ? <CreateProposalModal onClose={() => setCreating(false)} selectedAsset={selectedAsset} /> : null}
    </div>
  );
}

function CollateralTab({ selectedAsset }: { selectedAsset: DeployedAsset }) {
  const [modal, setModal] = useState<"add" | "borrow" | "repay" | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const collateral = collateralRows();
  const loans = loanRows();

  function reveal(key: string) {
    setRevealed((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  return (
    <div className="collateral-dashboard">
      <section className="collateral-hero">
        <div className="health-gauge" style={{ "--health": "78" } as CSSProperties}>
          <strong>78</strong>
          <span>Safe</span>
        </div>
        <div>
          <span className="muted">Collateral Health</span>
          <h3>Position is healthy</h3>
          <p className="muted">No liquidation warning. Amounts remain encrypted.</p>
        </div>
        <div className="collateral-actions">
          <button onClick={() => setModal("add")} type="button">+ Add Collateral</button>
          <button className="secondary" onClick={() => setModal("borrow")} type="button">Borrow</button>
          <button className="ghost-button" onClick={() => setModal("repay")} type="button">Repay</button>
        </div>
      </section>

      <section className="collateral-summary-grid">
        {["Total Collateral", "Total Borrowed", "Available to Borrow"].map((label) => (
          <div className="collateral-summary-card" key={label}>
            <span>{label}</span>
            <strong>🔒 Hidden</strong>
            <button className="ghost-button" type="button">Reveal</button>
          </div>
        ))}
        <div className="collateral-summary-card">
          <span>Net APY</span>
          <strong>4.82%</strong>
          <small>Private portfolio blend</small>
        </div>
      </section>

      <section className="collateral-table-grid">
        {collateral.length === 0 && loans.length === 0 ? (
          <EmptyState action="Add Collateral →" href="#collateral" text="Lock assets as confidential collateral to borrow." title="No collateral positions" />
        ) : null}
        <CollateralTable title="Collateral Assets" rows={collateral} revealed={revealed} onReveal={reveal} />
        <LoanTable rows={loans} revealed={revealed} onReveal={reveal} />
      </section>

      {modal ? <CollateralModal kind={modal} selectedAsset={selectedAsset} onClose={() => setModal(null)} /> : null}
    </div>
  );
}

function VotingModal({ onClose, proposal }: { onClose: () => void; proposal: GovernanceProposal }) {
  const [choice, setChoice] = useState<"yes" | "no">("yes");
  return (
    <div className="asset-drawer-overlay" role="dialog" aria-modal="true" aria-label="Private voting modal">
      <aside className="asset-drawer governance-modal">
        <div className="drawer-header">
          <div>
            <span className="muted">Private vote</span>
            <h3>{proposal.title}</h3>
          </div>
          <button className="ghost-button close-button" onClick={onClose} type="button">Close</button>
        </div>
        <p className="muted">{proposal.excerpt} Full proposal details are evaluated with encrypted voting weight.</p>
        <div className="vote-toggle">
          <button className={choice === "yes" ? "active yes" : undefined} onClick={() => setChoice("yes")} type="button">✅ Vote Yes</button>
          <button className={choice === "no" ? "active no" : undefined} onClick={() => setChoice("no")} type="button">❌ Vote No</button>
        </div>
        <div className="privacy-notice">🔒 Your vote is private until reveal</div>
        <div className="recipient-status ok">You are eligible to vote</div>
        <div className="trade-steps">
          <span className="active">TEE signing</span>
          <span>Submit vote</span>
          <span>Confirmed 🔒</span>
        </div>
        <button type="button">Confirm Vote</button>
      </aside>
    </div>
  );
}

function CreateProposalModal({ onClose, selectedAsset }: { onClose: () => void; selectedAsset: DeployedAsset }) {
  return (
    <div className="asset-drawer-overlay" role="dialog" aria-modal="true" aria-label="Create governance proposal">
      <aside className="asset-drawer governance-modal">
        <div className="drawer-header">
          <div>
            <span className="muted">Token holders only</span>
            <h3>New Proposal</h3>
          </div>
          <button className="ghost-button close-button" onClick={onClose} type="button">Close</button>
        </div>
        <label className="trade-field">Title<input placeholder="Proposal title" /></label>
        <label className="trade-field">Description<input placeholder="Describe the protocol change" /></label>
        <label className="trade-asset-select">
          Affected assets
          <select defaultValue={selectedAsset.symbol} multiple>
            {deployedAssets.slice(0, 12).map((asset) => <option key={asset.symbol} value={asset.symbol}>{asset.symbol} · {asset.name}</option>)}
          </select>
        </label>
        <label className="trade-field">Voting Duration<input placeholder="7 days" /></label>
        <button type="button">Create Proposal</button>
      </aside>
    </div>
  );
}

function CollateralTable({
  onReveal,
  revealed,
  rows,
  title,
}: {
  onReveal: (key: string) => void;
  revealed: string[];
  rows: ReturnType<typeof collateralRows>;
  title: string;
}) {
  return (
    <div className="collateral-table-card">
      <div>
        <strong>{title}</strong>
        <p className="muted">Amounts and values stay encrypted until reveal.</p>
      </div>
      <table className="rewards-table">
        <thead><tr><th>Asset</th><th>Amount</th><th>Value</th><th>Collateral Factor</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const key = `collateral-${row.asset.symbol}`;
            const isRevealed = revealed.includes(key);
            return (
              <tr key={row.asset.symbol}>
                <td><div className="asset-cell"><span className={`asset-token-icon ${marketDisplay(row.asset).tone}`}>{assetBadge(row.asset)}</span><strong>{row.asset.symbol}</strong></div></td>
                <td>{isRevealed ? row.amount : "🔒 Hidden"} <button className="ghost-button" onClick={() => onReveal(key)} type="button">Reveal</button></td>
                <td>{isRevealed ? row.value : "🔒 Hidden"}</td>
                <td>{row.factor}</td>
                <td><div className="table-actions"><button type="button">Add More</button><button className="secondary" type="button">Remove</button></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LoanTable({ onReveal, revealed, rows }: { onReveal: (key: string) => void; revealed: string[]; rows: ReturnType<typeof loanRows> }) {
  return (
    <div className="collateral-table-card">
      <div>
        <strong>Active Loans</strong>
        <p className="muted">Borrowed balances use confidential handles.</p>
      </div>
      <table className="rewards-table">
        <thead><tr><th>Borrowed Asset</th><th>Amount</th><th>Rate</th><th>Health</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const key = `loan-${row.asset.symbol}`;
            const isRevealed = revealed.includes(key);
            return (
              <tr key={row.asset.symbol}>
                <td><div className="asset-cell"><span className={`asset-token-icon ${marketDisplay(row.asset).tone}`}>{assetBadge(row.asset)}</span><strong>{row.asset.symbol}</strong></div></td>
                <td>{isRevealed ? row.amount : "🔒 Hidden"} <button className="ghost-button" onClick={() => onReveal(key)} type="button">Reveal</button></td>
                <td>{row.rate}</td>
                <td><span className="reward-status claimable">{row.health}</span></td>
                <td><div className="table-actions"><button type="button">Repay</button><button className="secondary" type="button">Repay All</button></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CollateralModal({ kind, onClose, selectedAsset }: { kind: "add" | "borrow" | "repay"; onClose: () => void; selectedAsset: DeployedAsset }) {
  return (
    <div className="asset-drawer-overlay" role="dialog" aria-modal="true" aria-label={`${kind} collateral modal`}>
      <aside className="asset-drawer governance-modal">
        <div className="drawer-header">
          <div>
            <span className="muted">Confidential collateral</span>
            <h3>{kind === "add" ? "Add Collateral" : kind === "borrow" ? "Borrow" : "Repay"}</h3>
          </div>
          <button className="ghost-button close-button" onClick={onClose} type="button">Close</button>
        </div>
        {kind === "add" ? <TradeAssetSelect label="Collateral assets" selectedSymbol={selectedAsset.symbol} onChange={() => undefined} /> : null}
        {kind === "borrow" ? (
          <>
            <TradeAssetSelect label="Loan asset" selectedSymbol="cUSDC" onChange={() => undefined} holdingsOnly />
            <label className="trade-field">Encrypted amount<input placeholder="🔒 0.00" /></label>
            <div className="privacy-notice">Collateral proof step: TEE verifies sufficiency without exposing balance.</div>
            <div className="recipient-status ok">Health preview after borrow: Safe</div>
          </>
        ) : null}
        {kind === "repay" ? <label className="trade-field">Repay amount<input placeholder="🔒 0.00" /></label> : null}
        <button type="button">{kind === "add" ? "Add Collateral" : kind === "borrow" ? "Borrow Privately" : "Repay Loan"}</button>
      </aside>
    </div>
  );
}

function AiToolsTab({ selectedAsset: defaultAsset }: { selectedAsset: DeployedAsset }) {
  const selected = useSelectedAsset(defaultAsset.symbol);
  const selectedAsset = selected.selectedAsset;
  const access = useAiToolsAccess(selectedAsset);

  return (
    <div className="ai-tools-dashboard">
      <section className="ai-tools-header">
        <div>
          <span className="chaingpt-badge">ChainGPT</span>
          <h2>AI Tools — Powered by ChainGPT</h2>
          <p>Access control: Premium features require token holdings.</p>
        </div>
        <div className="ai-header-badges">
          <NetworkBadge />
          <TierBadge tier="Tier 2" />
          <KYCBadge status={selectedAsset.requiresKYC ? "Required" : "Open"} />
        </div>
      </section>

      <AssetSelectorBar selectedSymbol={selected.selectedSymbol} onChange={selected.setSelectedSymbol} />

      {!access.unlocked ? (
        <AiToolsLockedState
          access={access}
          selectedAsset={selectedAsset}
          onSwitchAsset={(symbol) => selected.setSelectedSymbol(symbol)}
        />
      ) : null}

      <section className="ai-tool-grid">
        <DynamicContractAuditor asset={selectedAsset} locked={!access.unlocked} />
        <DynamicLLMAssistant asset={selectedAsset} locked={!access.unlocked} />
        <DynamicOnChainInsights asset={selectedAsset} locked={!access.unlocked} />
      </section>
    </div>
  );
}

function useAiToolsAccess(selectedAsset: DeployedAsset) {
  const selectedBalance = useSelectedConfidentialBalance(selectedAsset);
  const anyBalance = useAnyConfidentialBalance(deployedAssets);
  const otherHeldAsset = anyBalance.heldAssets.find((asset) => asset.symbol !== selectedAsset.symbol);

  return {
    error: selectedBalance.error ?? anyBalance.error,
    hasAnyConfidentialBalance: anyBalance.hasAnyConfidentialBalance,
    hasSelectedAssetBalance: selectedBalance.hasSelectedAssetBalance,
    isConnected: selectedBalance.isConnected,
    loading: selectedBalance.loading || anyBalance.loading,
    otherHeldAsset,
    unlocked: selectedBalance.hasSelectedAssetBalance,
  };
}

function AssetSelectorBar({
  onChange,
  selectedSymbol,
}: {
  onChange: (symbol: string) => void;
  selectedSymbol: string;
}) {
  const [category, setCategory] = useState<AssetCategory | "ALL">("ALL");
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const selectedAsset = deployedAssets.find((asset) => asset.symbol === selectedSymbol) ?? deployedAssets[0];

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem("private-stocks:recent-ai-assets");
      if (stored) setRecentlyViewed(JSON.parse(stored) as string[]);
    } catch {
      setRecentlyViewed([]);
    }
  }, []);

  useEffect(() => {
    setRecentlyViewed((current) => {
      const next = [selectedSymbol, ...current.filter((symbol) => symbol !== selectedSymbol)].slice(0, 5);
      window.sessionStorage.setItem("private-stocks:recent-ai-assets", JSON.stringify(next));
      return next;
    });
  }, [selectedSymbol]);

  const visibleAssets = useMemo(() => {
    return category === "ALL" ? deployedAssets : deployedAssets.filter((asset) => asset.category === category);
  }, [category]);

  return (
    <section className="asset-selector-bar">
      <div className="row">
        <div>
          <span className="muted">Select Asset to Analyze</span>
          <h3>{selectedAsset.symbol} · {selectedAsset.name}</h3>
        </div>
        <KYCBadge status={selectedAsset.requiresKYC ? "Required" : "Open"} />
      </div>
      <AssetSelector label="Searchable asset registry" selectedSymbol={selectedSymbol} onChange={onChange} assets={visibleAssets} />
      <div className="asset-selector-filters">
        {categoryPills.map((item) => (
          <button
            className={category === item.value ? "active" : undefined}
            key={item.value}
            onClick={() => setCategory(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {recentlyViewed.length ? (
        <div className="recent-assets">
          <span>Recently viewed:</span>
          {recentlyViewed.map((symbol) => (
            <button key={symbol} onClick={() => onChange(symbol)} type="button">{symbol}</button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AiToolsLockedState({
  access,
  onSwitchAsset,
  selectedAsset,
}: {
  access: ReturnType<typeof useAiToolsAccess>;
  onSwitchAsset: (symbol: string) => void;
  selectedAsset: DeployedAsset;
}) {
  let message = `Connect a verified wallet and wrap ${selectedAsset.symbol} into confidential ${selectedAsset.symbol} to unlock this feature.`;
  let action: ReactNode = <a href="#trade">Wrap {selectedAsset.symbol}</a>;

  if (!access.isConnected) {
    message = "Connect wallet to access AI Tools.";
    action = <a href="#wallet">Connect Wallet</a>;
  } else if (access.loading) {
    message = `Checking confidential balances before unlocking ${selectedAsset.symbol} AI Tools.`;
    action = null;
  } else if (access.otherHeldAsset) {
    message = `You hold ${access.otherHeldAsset.symbol} — switch to that asset or wrap ${selectedAsset.symbol} to unlock.`;
    action = (
      <button onClick={() => onSwitchAsset(access.otherHeldAsset?.symbol ?? selectedAsset.symbol)} type="button">
        Switch to {access.otherHeldAsset.symbol}
      </button>
    );
  } else if (!access.hasAnyConfidentialBalance) {
    message = "Wrap any confidential asset to unlock AI Tools.";
  }

  return (
    <section className="locked-section ai-locked-state">
      <strong>Confidential token holder access required</strong>
      <p>{message}</p>
      {action}
      {access.error ? <p className="error">{access.error.message}</p> : null}
    </section>
  );
}

function DynamicOnChainInsights({ asset, locked }: { asset: DeployedAsset; locked: boolean }) {
  const market = marketDisplay(asset);
  const totalSupply = useReadContract({
    address: asset.baseAddress,
    abi: erc20Abi,
    functionName: "totalSupply",
    query: { enabled: !locked },
  });
  const wrappedSupply = useReadContract({
    address: asset.baseAddress,
    abi: baseAssetAbi,
    functionName: "balanceOf",
    args: [asset.wrapperAddress],
    query: { enabled: !locked },
  });

  const loading = totalSupply.isLoading || wrappedSupply.isLoading;
  const total = typeof totalSupply.data === "bigint" ? totalSupply.data : 0n;
  const wrapped = typeof wrappedSupply.data === "bigint" ? wrappedSupply.data : 0n;
  const wrapRatio = total > 0n ? Number((wrapped * 10000n) / total) / 100 : 0;
  const metrics = [
    { label: "Total Base Supply", short: "Base", score: total > 0n ? 82 : 12, value: totalSupply.error ? "No data available" : formatTokenMetric(total) },
    { label: "Total Wrapped Supply", short: "Wrapped", score: wrapped > 0n ? 72 : 8, value: wrappedSupply.error ? "No data available" : formatTokenMetric(wrapped) },
    { label: "Wrap Ratio", short: "Ratio", score: Math.min(100, wrapRatio), value: `${wrapRatio.toFixed(2)}%` },
    { label: "Unique Holders", short: "Holders", score: 45, value: "No data available" },
    { label: "Confidential Holders", short: "Private", score: 38, value: "No data available" },
    { label: "Last Wrap Event", short: "Wrap", score: 62, value: "No data available" },
    { label: "Last Transfer Event", short: "Transfer", score: 58, value: "No data available" },
  ];

  return (
    <article className={locked ? "ai-tool-panel insights-panel locked-panel" : "ai-tool-panel insights-panel"}>
      <div className="ai-panel-header">
        <strong>{asset.symbol} On-Chain Insights</strong>
        <ConfidentialBadge label="Aggregate only" />
      </div>
      <PriceDisplay change={market.change} price={market.price} symbol={asset.symbol} />
      <div className="ai-address-grid">
        <div>
          <span>Base Token</span>
          <AddressDisplay address={asset.baseAddress} />
        </div>
        <div>
          <span>Wrapper</span>
          <AddressDisplay address={asset.wrapperAddress} />
        </div>
      </div>
      {loading ? <SkeletonRows rows={4} /> : null}
      <div className="insight-metrics-grid">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
        <div>
          <span>Contract Verified</span>
          <strong><a href={addressUrl(asset.wrapperAddress)} rel="noreferrer" target="_blank">✅ Yes</a></strong>
        </div>
        <div>
          <span>Asset Category</span>
          <strong>{categoryLabels[asset.category]}</strong>
        </div>
        <div>
          <span>KYC Required</span>
          <strong>{asset.requiresKYC ? "Yes" : "No"}</strong>
        </div>
      </div>
      <div className="privacy-notice">Individual balances are never exposed 🔒</div>
      <ResponsiveContainer height={190} width="100%">
        <BarChart data={metrics}>
          <XAxis dataKey="short" stroke="#475569" tick={{ fill: "#94A3B8", fontSize: 11 }} />
          <YAxis hide />
          <Tooltip contentStyle={{ background: "#111318", border: "1px solid #2A2D3A", borderRadius: 8, color: "#F8FAFC" }} />
          <Bar dataKey="score" fill="#10B981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </article>
  );
}

function DynamicContractAuditor({ asset, locked }: { asset: DeployedAsset; locked: boolean }) {
  const [contractType, setContractType] = useState<"Base" | "Wrapper">("Wrapper");
  const currentAddress = contractType === "Base" ? asset.baseAddress : asset.wrapperAddress;
  const standard = contractType === "Base" ? "ERC-3643" : "ERC-7984";

  return (
    <article className={locked ? "ai-tool-panel auditor-panel locked-panel" : "ai-tool-panel auditor-panel"}>
      <div className="ai-panel-header">
        <strong>{asset.symbol} Contract Auditor</strong>
        <span>Currently auditing: {contractType}</span>
      </div>
      <div className="segmented-control">
        {(["Base", "Wrapper"] as const).map((item) => (
          <button className={contractType === item ? "active" : undefined} key={item} onClick={() => setContractType(item)} type="button">
            {item} Contract
          </button>
        ))}
      </div>
      <div className="ai-address-box">
        <span>{asset.name} — {contractType} Contract</span>
        <AddressDisplay address={currentAddress} />
      </div>
      <button disabled={locked} type="button">Run Audit</button>
      <div className="audit-results">
        <SkeletonRows rows={2} />
        <div className="risk-score low">Audit Report: {asset.symbol} {contractType} Contract</div>
        <div className="audit-context">
          <span>Asset: {asset.name} ({asset.symbol})</span>
          <span>Category: {categoryLabels[asset.category]}</span>
          <span>Network: Arbitrum Sepolia</span>
          <span>Standard: {standard}</span>
        </div>
        <ul>
          <li><span className="severity low">LOW</span> Events preserve encrypted transfer amounts for {asset.symbol}</li>
          <li><span className="severity medium">MED</span> Confirm oracle freshness before production settlement</li>
          <li><span className="severity low">LOW</span> Access checks are tied to confidential holder state</li>
        </ul>
        <div className="recommendations">
          <strong>Recommendations</strong>
          <p>Verify the selected {contractType.toLowerCase()} address before demo transactions and keep encrypted handles out of public UI logs.</p>
        </div>
      </div>
    </article>
  );
}

function DynamicLLMAssistant({ asset, locked }: { asset: DeployedAsset; locked: boolean }) {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState(() => initialAssetMessages(asset));

  useEffect(() => {
    const shouldClear =
      messages.length <= 1 || window.confirm(`Switch AI Assistant context to ${asset.symbol}? This clears the current chat history.`);
    if (shouldClear) {
      setMessages(initialAssetMessages(asset));
      setChatInput("");
    }
  }, [asset.symbol]);

  const questions = suggestedAssetQuestions(asset);

  function sendMessage(forced?: string) {
    const prompt = (forced ?? chatInput).trim();
    if (!prompt || locked) return;
    setMessages((current) => [
      ...current,
      { role: "user", content: prompt },
      { role: "assistant", content: `Context loaded for ${asset.name} (${asset.symbol}). Base: ${shortAddress(asset.baseAddress)}. Wrapper: ${shortAddress(asset.wrapperAddress)}. ${asset.requiresKYC ? "KYC is required." : "KYC is open for this asset."}` },
    ]);
    setChatInput("");
  }

  return (
    <article className={locked ? "ai-tool-panel assistant-panel locked-panel" : "ai-tool-panel assistant-panel"}>
      <div className="ai-panel-header">
        <strong>{asset.symbol} AI Assistant 🤖</strong>
        <span>Powered by ChainGPT Web3 LLM</span>
      </div>
      <div className="system-context">
        You are viewing {asset.name} ({asset.symbol}), a {categoryLabels[asset.category]} asset on Arbitrum Sepolia. Base
        contract: {shortAddress(asset.baseAddress)}. Wrapper contract: {shortAddress(asset.wrapperAddress)}. KYC Required:
        {asset.requiresKYC ? " Yes" : " No"}. Standard: ERC-3643 + ERC-7984.
      </div>
      <div className="chat-window">
        {messages.map((message, index) => (
          <div className={`chat-bubble ${message.role === "assistant" ? "ai" : "user"}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
        <div className="typing-dots"><span /><span /><span /></div>
      </div>
      <div className="suggested-questions">
        {questions.map((question) => (
          <button className="secondary" disabled={locked} key={question} onClick={() => sendMessage(question)} type="button">{question}</button>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          disabled={locked}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder={`Ask about ${asset.symbol}`}
          value={chatInput}
        />
        <button disabled={locked || !chatInput.trim()} onClick={() => sendMessage()} type="button">Send</button>
      </div>
    </article>
  );
}

function initialAssetMessages(asset: DeployedAsset): AiChatMessage[] {
  return [
    {
      role: "assistant" as const,
      content: `You are viewing ${asset.name} (${asset.symbol}), a ${categoryLabels[asset.category]} asset deployed on Arbitrum Sepolia. Ask about wrapping, private transfers, KYC, dividends, collateral, or contract risk for this specific asset.`,
    },
  ];
}

function suggestedAssetQuestions(asset: DeployedAsset) {
  if (asset.category === AssetCategory.STOCK_US || asset.category === AssetCategory.STOCK_INTL) {
    return [
      `What is ${asset.symbol} and why is KYC required?`,
      `How do I wrap ${asset.symbol} tokens?`,
      `What dividends does ${asset.symbol} offer?`,
      `Which countries are blocked from holding ${asset.symbol}?`,
    ];
  }

  if (asset.category === AssetCategory.CRYPTO) {
    return [
      `What is confidential ${asset.symbol}?`,
      `How does ${asset.symbol} differ from regular ${asset.symbol.replace(/^c/, "")}?`,
      `Do I need KYC for ${asset.symbol}?`,
      `Can I use ${asset.symbol} as collateral?`,
    ];
  }

  if (asset.category === AssetCategory.COMMODITY) {
    return [
      `What backs the value of ${asset.symbol}?`,
      `How is ${asset.symbol} price determined?`,
      `What settlement currency does ${asset.symbol} use?`,
    ];
  }

  return [
    `How does ${asset.symbol} maintain its peg?`,
    `Can I use ${asset.symbol} to buy other assets?`,
    `What yield does ${asset.symbol} offer?`,
  ];
}

function formatTokenMetric(value: bigint) {
  if (value === 0n) return "0";
  const formatted = formatEther(value);
  const [whole, fraction = ""] = formatted.split(".");
  const compactWhole = new Intl.NumberFormat("en-US").format(Number(whole));
  const trimmedFraction = fraction.slice(0, 2).replace(/0+$/, "");
  return trimmedFraction ? `${compactWhole}.${trimmedFraction}` : compactWhole;
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

function tradeChartData(asset: DeployedAsset, range: "1H" | "1D" | "7D" | "30D") {
  const market = marketDisplay(asset);
  const points = range === "1H" ? 12 : range === "1D" ? 24 : range === "7D" ? 14 : 30;
  return Array.from({ length: points }, (_, index) => {
    return {
      label: `${index + 1}`,
      price: market.price,
      volume: 0,
    };
  });
}

function tradeHistory() {
  const fallbackHash = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
  return [
    { action: "Wrapped cAAPL", hash: fallbackHash, status: "Confirmed", time: "12m ago" },
    { action: "Sent cBTC confidentially", hash: fallbackHash, status: "Pending", time: "38m ago" },
    { action: "Unwrapped cUSDC", hash: fallbackHash, status: "Confirmed", time: "2h ago" },
    { action: "Private swap cETH → cUSDC", hash: fallbackHash, status: "Failed", time: "1d ago" },
  ];
}

function dividendRows(tab: "stocks" | "crypto" | "stablecoins" | "commodities") {
  const symbolsByTab = {
    commodities: ["cGOLD", "cOIL", "cSILVER"],
    crypto: ["cBTC", "cETH", "cSOL"],
    stablecoins: ["cUSDC", "cUSDT", "cDAI"],
    stocks: ["cAAPL", "cTSLA", "cNVDA", "cASML"],
  };
  return symbolsByTab[tab].map((symbol, index) => {
    const asset = deployedAssets.find((item) => item.symbol === symbol) ?? deployedAssets[0];
    return {
      amount: tab === "commodities" ? "N/A" : `${(3.4 + index * 1.8).toFixed(2)} ${asset.symbol}`,
      asset,
      distributed: tab === "commodities" ? "Disabled" : `🔒 ${formatMarketPrice(12000 + index * 4300)}`,
      period: index % 2 === 0 ? "Q1 2026" : "Mar 2026",
      status: tab === "commodities" ? "Pending" : index === 1 ? "Claimed" : index === 2 ? "Pending" : "Claimable",
    };
  });
}

function monthlyDistributionData() {
  return ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map((month, index) => ({ month, value: 8000 + index * 2200 + (index % 2) * 1400 }));
}

function governanceProposals(): GovernanceProposal[] {
  return [
    {
      assets: ["Protocol-wide", "cAAPL", "cTSLA"],
      deadline: "Ends in 2d 04h",
      execution: "Queued",
      excerpt: "Adjust confidential collateral thresholds for major equity wrappers after oracle volatility review.",
      forPct: 68,
      participation: 42,
      status: "Active",
      title: "Update equity collateral factors",
      voters: 34,
    },
    {
      assets: ["cBTC", "cETH"],
      deadline: "Closed Apr 12",
      execution: "Executed",
      excerpt: "Enable expanded confidential rewards for liquid crypto asset wrappers.",
      forPct: 74,
      participation: 51,
      status: "Passed",
      title: "Expand crypto rewards program",
      voters: 58,
    },
    {
      assets: ["cGOLD", "cUSDC"],
      deadline: "Closed Apr 02",
      execution: "Not executed",
      excerpt: "Route commodity settlement discounts through confidential stablecoin pairs.",
      forPct: 39,
      participation: 28,
      status: "Failed",
      title: "Commodity settlement discount",
      voters: 21,
    },
  ];
}

function collateralRows() {
  return ["cAAPL", "cBTC", "cGOLD", "cUSDC"].map((symbol, index) => {
    const asset = deployedAssets.find((item) => item.symbol === symbol) ?? deployedAssets[0];
    return {
      amount: `${(12.5 + index * 4.2).toFixed(2)} ${asset.symbol}`,
      asset,
      factor: `${70 - index * 5}%`,
      value: formatMarketPrice((12.5 + index * 4.2) * marketDisplay(asset).price),
    };
  });
}

function loanRows() {
  return ["cUSDC", "cDAI", "cEURC"].map((symbol, index) => {
    const asset = deployedAssets.find((item) => item.symbol === symbol) ?? deployedAssets[0];
    return {
      amount: `${(1800 + index * 700).toLocaleString()} ${asset.symbol}`,
      asset,
      health: index === 2 ? "Warning" : "Safe",
      rate: `${(3.2 + index * 0.8).toFixed(2)}%`,
    };
  });
}

function insightMetrics(asset: DeployedAsset) {
  const index = deployedAssets.findIndex((item) => item.symbol === asset.symbol);
  return [
    { label: "Total Supply", score: 82, short: "Supply", value: "1,000,000" },
    { label: "Holder Count", score: 48 + (index % 30), short: "Holders", value: `${240 + index * 7}` },
    { label: "Transfer Volume (24h)", score: 64, short: "Volume", value: "🔒 Aggregate" },
    { label: "Wrap/Unwrap ratio", score: 71, short: "Ratio", value: "3.4 : 1" },
    { label: "Last activity timestamp", score: 39, short: "Recent", value: "14m ago" },
  ];
}

function marketDisplay(asset: DeployedAsset, historicalPrices?: number[]) {
  const quote = getCachedAssetPrice(asset.symbol);
  const basePrice = quote?.price ?? 0;
  const change = quote?.change24h ?? 0;
  const fallbackPrice = basePrice > 0 ? basePrice : 1;
  const sparkline = historicalPrices && historicalPrices.length > 0 ? historicalPrices : Array.from({ length: 7 }, () => fallbackPrice);
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

  return { available: Boolean(quote), change, price: basePrice, sparkline, tone };
}

function formatMarketPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: value >= 100 ? 2 : 2,
    style: "currency",
  }).format(value);
}

function formatRefreshAge(lastRefresh: Date) {
  const seconds = Math.max(0, Math.round((Date.now() - lastRefresh.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
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
