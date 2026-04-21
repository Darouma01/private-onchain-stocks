"use client";

import { FormEvent, type CSSProperties, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AssetCategory } from "@/deploy/assets.config";
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
import { AddressDisplay, AssetSelector, EmptyState, KYCBadge, NetworkBadge, SkeletonRows, TierBadge } from "@/components/SharedUi";
import { getCachedAssetPrice, usePrices } from "@/lib/prices/usePrices";
import { getUtilityText } from "@/lib/utilities/getUtilityText";
import { SparklineChart } from "@/components/SparklineChart";
import { TransferTab } from "@/components/trade/TransferTab";
import { TradeAssetSelect } from "@/components/trade/TradeShared";
import { UnwrapTab } from "@/components/trade/UnwrapTab";
import { WrapTab } from "@/components/trade/WrapTab";
import type { TradeMode } from "@/components/trade/tradeTypes";
import { ContractAuditor } from "@/components/ai/ContractAuditor";
import { LLMAssistant } from "@/components/ai/LLMAssistant";
import { OnChainInsights } from "@/components/ai/OnChainInsights";
import { AssetDetailDrawer } from "@/components/markets/AssetDetailDrawer";
import { AssetSearch } from "@/components/markets/AssetSearch";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";

type Tab = "Markets" | "Portfolio" | "Trade" | "Dividends" | "Governance" | "Collateral" | "AI Tools";
type MarketSortKey = "symbol" | "name" | "category" | "price" | "change" | "kyc";
type SortDirection = "asc" | "desc";

type ActionState = {
  label: string;
  hash?: `0x${string}`;
  error?: string;
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
  const [tradeMode, setTradeMode] = useState<TradeMode>("Wrap");
  const [category, setCategory] = useState<AssetCategory | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const { selectedAsset, selectedSymbol, setSelectedSymbol } = useSelectedAsset();

  function openTrade(asset: DeployedAsset, mode: TradeMode) {
    setSelectedSymbol(asset.symbol);
    setTradeMode(mode);
    setTab("Trade");
    window.history.replaceState(null, "", `?asset=${encodeURIComponent(asset.symbol)}#trade`);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return deployedAssets.filter((asset) => {
      const matchesCategory = category === "ALL" || asset.category === category;
      const matchesQuery =
        normalized.length === 0 ||
        assetMatchesQuery(asset, normalized);
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
          selectedAsset={selectedAsset}
          openTrade={openTrade}
        />
      ) : null}
      {tab === "Portfolio" ? <PortfolioTab selectedAsset={selectedAsset} /> : null}
      {tab === "Trade" ? <TradeTab mode={tradeMode} selectedAsset={selectedAsset} setMode={setTradeMode} setSelectedSymbol={setSelectedSymbol} /> : null}
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
  openTrade,
}: {
  category: AssetCategory | "ALL";
  categoryCounts: Array<{ category: AssetCategory; count: number }>;
  filteredAssets: DeployedAsset[];
  query: string;
  selectedSymbol: string;
  selectedAsset: DeployedAsset;
  setCategory: (category: AssetCategory | "ALL") => void;
  setQuery: (query: string) => void;
  openTrade: (asset: DeployedAsset, mode: TradeMode) => void;
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

      <AssetSearch onQueryChange={setQuery} query={query} resultCount={sortedAssets.length} totalCount={deployedAssets.length} />

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
          <EmptyState action="Clear search →" href="#markets" text={query ? `No results for ${query}` : "Try a different search term or category filter."} title="No markets found" />
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
                  onTrade={() => openTrade(asset, "Transfer")}
                  onToggleFavorite={() => toggleFavorite(asset.symbol)}
                  onWrap={() => openTrade(asset, "Wrap")}
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
        <AssetDetailDrawer
          asset={detailAsset}
          change={marketDisplay(detailAsset, sparklineState.sparklines[detailAsset.symbol]).change}
          onClose={() => setDetailAsset(null)}
          onWrap={() => {
            openTrade(detailAsset, "Wrap");
            setDetailAsset(null);
          }}
          price={marketDisplay(detailAsset, sparklineState.sparklines[detailAsset.symbol]).price}
          sparklineData={marketDisplay(detailAsset, sparklineState.sparklines[detailAsset.symbol]).sparkline}
          tone={marketDisplay(detailAsset, sparklineState.sparklines[detailAsset.symbol]).tone}
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

function assetMatchesQuery(asset: DeployedAsset, normalizedQuery: string) {
  if (asset.symbol.toLowerCase().includes(normalizedQuery)) return true;
  if (categoryLabels[asset.category].toLowerCase().includes(normalizedQuery)) return true;
  if (asset.category.toLowerCase().includes(normalizedQuery)) return true;
  if (asset.country?.toLowerCase().includes(normalizedQuery)) return true;

  const searchableWords = `${asset.name} ${asset.complianceNotes}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return searchableWords.some((word) => word === normalizedQuery);
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
  onTrade,
  onToggleFavorite,
  onWrap,
  sparklineData,
  sparklineLoading,
}: {
  asset: DeployedAsset;
  favorite: boolean;
  index: number;
  isSelected: boolean;
  onDetails: () => void;
  onTrade: () => void;
  onToggleFavorite: () => void;
  onWrap: () => void;
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
          <button onClick={onWrap} type="button">Wrap</button>
          <button className="secondary" onClick={onTrade} type="button">Trade</button>
          <a className="ghost-button" href={`/?asset=${encodeURIComponent(asset.symbol)}#portfolio-utilities`}>Use {asset.symbol}</a>
          <button className="ghost-button" onClick={onDetails} type="button">Details</button>
        </div>
      </td>
    </tr>
  );
}

function PortfolioTab({
  selectedAsset: _selectedAsset,
}: {
  selectedAsset: DeployedAsset;
}) {
  return <PortfolioSection />;
}

function TradeTab({
  mode,
  selectedAsset,
  setMode,
  setSelectedSymbol,
}: {
  mode: TradeMode;
  selectedAsset: DeployedAsset;
  setMode: (mode: TradeMode) => void;
  setSelectedSymbol: (symbol: string) => void;
}) {
  const [chartRange, setChartRange] = useState<"1H" | "1D" | "7D" | "30D">("7D");
  const market = marketDisplay(selectedAsset);
  const chartData = tradeChartData(selectedAsset, chartRange);
  const tradeTabs: TradeMode[] = ["Wrap", "Transfer", "Unwrap"];

  return (
    <div className="trade-dashboard">
      <section className="trade-layout">
        <div className="trade-panel">
          <div className="trade-panel-tabs" role="tablist" aria-label="Trade mode">
            {tradeTabs.map((item) => (
              <button className={mode === item ? "active" : undefined} key={item} onClick={() => setMode(item)} type="button">
                {item}
              </button>
            ))}
          </div>

          {mode === "Wrap" ? <WrapTab selectedAsset={selectedAsset} setSelectedSymbol={setSelectedSymbol} /> : null}
          {mode === "Transfer" ? <TransferTab selectedAsset={selectedAsset} setSelectedSymbol={setSelectedSymbol} /> : null}
          {mode === "Unwrap" ? <UnwrapTab selectedAsset={selectedAsset} setSelectedSymbol={setSelectedSymbol} /> : null}
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
            <TradeAssetSelect label="Loan asset" selectedSymbol="cUSDC" onChange={() => undefined} />
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

  return (
    <div className="ai-tools-dashboard">
      <section className="ai-tools-header">
        <div>
          <span className="chaingpt-badge">ChainGPT</span>
          <h2>AI Tools — Powered by ChainGPT</h2>
          <p>Public assistant and basic on-chain metrics are available immediately. Full audits and full insights unlock with confidential holder access.</p>
        </div>
        <div className="ai-header-badges">
          <NetworkBadge />
          <TierBadge tier="Tier 2" />
          <KYCBadge status={selectedAsset.requiresKYC ? "Required" : "Open"} />
        </div>
      </section>

      <AssetSelectorBar selectedSymbol={selected.selectedSymbol} onChange={selected.setSelectedSymbol} />

      <section className="ai-tool-grid">
        <ContractAuditor asset={selectedAsset} />
        <LLMAssistant asset={selectedAsset} />
        <OnChainInsights asset={selectedAsset} />
      </section>
    </div>
  );
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
