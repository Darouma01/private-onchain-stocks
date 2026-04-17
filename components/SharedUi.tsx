"use client";

import { type CSSProperties, useState } from "react";
import { AssetCategory } from "@/deploy/assets.config";
import { categoryLabels, deployedAssetCategories, deployedAssets, type DeployedAsset } from "@/lib/deployed-assets";
import { addressUrl, shortAddress } from "@/lib/contracts";

export function AssetSelector({
  assets = deployedAssets,
  label,
  onChange,
  selectedSymbol,
}: {
  assets?: DeployedAsset[];
  label: string;
  onChange: (symbol: string) => void;
  selectedSymbol: string;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filtered = assets.filter(
    (asset) =>
      normalized.length === 0 ||
      asset.symbol.toLowerCase().includes(normalized) ||
      asset.name.toLowerCase().includes(normalized) ||
      categoryLabels[asset.category].toLowerCase().includes(normalized),
  );

  return (
    <div className="shared-asset-selector">
      <label>{label}</label>
      <input onChange={(event) => setQuery(event.target.value)} placeholder="Search all 61 assets" value={query} />
      <select onChange={(event) => onChange(event.target.value)} value={selectedSymbol}>
        {deployedAssetCategories.map((category) => (
          <optgroup key={category} label={categoryLabels[category]}>
            {filtered
              .filter((asset) => asset.category === category)
              .map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {assetBadge(asset)} {asset.symbol} · {asset.name} · {categoryLabels[asset.category]} · {asset.requiresKYC ? "KYC Required" : "Open"}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export function ConfidentialBadge({ label = "Hidden" }: { label?: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button className={revealed ? "confidential-badge revealed" : "confidential-badge"} onClick={() => setRevealed((value) => !value)} type="button">
      {revealed ? label : "🔒 Hidden"}
    </button>
  );
}

export function TierBadge({ tier }: { tier: "Tier 1" | "Tier 2" | "Tier 3" | "Institutional" }) {
  return <span className={`shared-tier-badge ${tier.toLowerCase().replace(" ", "-")}`}>{tier}</span>;
}

export function KYCBadge({ status }: { status: "Required" | "Verified" | "Open" }) {
  return <span className={`shared-kyc-badge ${status.toLowerCase()}`}>{status}</span>;
}

export function NetworkBadge({ network = "Arbitrum Sepolia" }: { network?: string }) {
  return <span className="shared-network-badge">⬡ {network}</span>;
}

export function PriceDisplay({ change, price, symbol }: { change: number; price: number; symbol?: string }) {
  return (
    <div className="shared-price-display">
      <strong>{formatPrice(price)}</strong>
      <span className={change >= 0 ? "change-up" : "change-down"}>
        {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}% {symbol ? symbol : ""}
      </span>
    </div>
  );
}

export function TransactionModal({ onClose, title }: { onClose: () => void; title: string }) {
  return (
    <div className="asset-drawer-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <aside className="asset-drawer transaction-modal">
        <div className="drawer-header">
          <h3>{title}</h3>
          <button className="ghost-button close-button" onClick={onClose} type="button">Close</button>
        </div>
        <div className="trade-steps">
          <span className="active">Prepare</span>
          <span>Sign</span>
          <span>Confirmed 🔒</span>
        </div>
      </aside>
    </div>
  );
}

export function AddressDisplay({ address }: { address: `0x${string}` }) {
  async function copy() {
    await navigator.clipboard.writeText(address);
  }

  return (
    <span className="shared-address-display">
      <code>{shortAddress(address)}</code>
      <button className="ghost-button" onClick={() => void copy()} type="button">Copy</button>
      <a href={addressUrl(address)} rel="noreferrer" target="_blank">Arbiscan</a>
    </span>
  );
}

export function HealthGauge({ health }: { health: number }) {
  const tone = health > 70 ? "safe" : health > 45 ? "warning" : "danger";
  return (
    <div className={`shared-health-gauge ${tone}`} style={{ "--health": `${health}` } as CSSProperties}>
      <strong>{health}</strong>
      <span>{tone}</span>
    </div>
  );
}

export function SparklineChart({ positive = true, values }: { positive?: boolean; values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => `${((index / (values.length - 1)) * 90).toFixed(1)},${(32 - ((value - min) / range) * 26).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="shared-sparkline" viewBox="0 0 90 36" role="img" aria-label="Mini price trend">
      <polyline fill="none" points={points} stroke={positive ? "#10B981" : "#EF4444"} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function EmptyState({
  action,
  href,
  text,
  title,
}: {
  action: string;
  href: string;
  text: string;
  title: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">🔒</div>
      <strong>{title}</strong>
      <p>{text}</p>
      <a href={href}>{action}</a>
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-rows" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => <span key={index} />)}
    </div>
  );
}

function assetBadge(asset: DeployedAsset) {
  if (asset.category === AssetCategory.STOCK_US) return "🇺🇸";
  if (asset.category === AssetCategory.STOCK_INTL) return "🌍";
  return asset.symbol.replace(/^c/, "").slice(0, 3).toUpperCase();
}

function formatPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: value >= 100 ? 2 : 2,
    style: "currency",
  }).format(value);
}
