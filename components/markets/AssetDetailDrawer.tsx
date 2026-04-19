"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryLabels, type DeployedAsset } from "@/lib/deployed-assets";
import { addressUrl, shortAddress } from "@/lib/contracts";

export function AssetDetailDrawer({
  asset,
  change,
  onClose,
  onWrap,
  price,
  sparklineData,
  tone,
}: {
  asset: DeployedAsset;
  change: number;
  onClose: () => void;
  onWrap: () => void;
  price: number;
  sparklineData: number[];
  tone: string;
}) {
  const chartData = useMemo(() => sparklineData.map((value, index) => ({ label: `${index + 1}`, value })), [sparklineData]);

  async function copyAddress(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="asset-drawer-overlay" role="dialog" aria-modal="true" aria-label={`${asset.symbol} asset details`}>
      <aside className="asset-drawer">
        <div className="drawer-header">
          <div className="asset-cell">
            <span className={`asset-token-icon large ${tone}`}>{assetIcon(asset)}</span>
            <div>
              <span className="muted">{asset.country ?? "Global"}</span>
              <h3>{asset.symbol} · {asset.name}</h3>
            </div>
          </div>
          <button aria-label="Close asset details" className="ghost-button close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="drawer-badge-row">
          <span className="category-chip">{categoryLabels[asset.category]}</span>
          <span className={asset.requiresKYC ? "kyc-pill required" : "kyc-pill open"}>
            {asset.requiresKYC ? "KYC Required" : "Open"}
          </span>
        </div>

        <div className="drawer-price-row">
          <strong>{formatUsd(price)}</strong>
          <span className={change >= 0 ? "change-up" : "change-down"}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
          </span>
        </div>

        <div className="drawer-chart">
          <ResponsiveContainer height={180} width="100%">
            <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 12, top: 10 }}>
              <XAxis dataKey="label" hide />
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Tooltip
                contentStyle={{ background: "#111318", border: "1px solid #2A2D3A", borderRadius: 8, color: "#F8FAFC" }}
                formatter={(value) => [formatUsd(Number(value)), asset.symbol]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Line
                dataKey="value"
                dot={false}
                isAnimationActive={false}
                stroke={change >= 0 ? "#10B981" : "#EF4444"}
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="drawer-section">
          <strong>Contract addresses</strong>
          <ContractRow label="Base" value={asset.baseAddress} onCopy={() => void copyAddress(asset.baseAddress)} />
          <ContractRow label="Wrapper" value={asset.wrapperAddress} onCopy={() => void copyAddress(asset.wrapperAddress)} />
        </div>

        <div className="drawer-section">
          <strong>Standards</strong>
          <p className="muted">ERC-3643 + ERC-7984</p>
          <strong>Network</strong>
          <p className="muted">Arbitrum Sepolia</p>
        </div>

        <div className="drawer-section">
          <strong>KYC requirement</strong>
          <p className="muted">{asset.requiresKYC ? asset.complianceNotes : "This market is open for wrapping and confidential transfer without KYC gating."}</p>
        </div>

        <div className="drawer-actions">
          <button onClick={onWrap} type="button">Wrap this Asset</button>
          <a className="button-link" href={addressUrl(asset.wrapperAddress)} rel="noreferrer" target="_blank">View on Arbiscan</a>
        </div>
      </aside>
    </div>
  );
}

function ContractRow({ label, onCopy, value }: { label: string; onCopy: () => void; value: `0x${string}` }) {
  return (
    <div className="copy-row">
      <span>{label}</span>
      <code>{shortAddress(value)}</code>
      <button className="secondary" onClick={onCopy} type="button">Copy</button>
      <a href={addressUrl(value)} rel="noreferrer" target="_blank">Arbiscan</a>
    </div>
  );
}

function assetIcon(asset: DeployedAsset) {
  if (asset.country === "US") return "🇺🇸";
  if (asset.country === "JP" || asset.country === "Japan") return "🇯🇵";
  if (asset.country === "DE" || asset.country === "Germany") return "🇩🇪";
  if (asset.country === "NL" || asset.country === "Netherlands") return "🇳🇱";
  if (asset.country === "DK" || asset.country === "Denmark") return "🇩🇰";
  if (asset.country === "GB" || asset.country === "UK") return "🇬🇧";
  if (asset.country === "KR" || asset.country === "South Korea") return "🇰🇷";
  if (asset.country === "CN" || asset.country === "HK" || asset.country === "China/HK") return "🇭🇰";
  if (asset.country === "CH" || asset.country === "Switzerland") return "🇨🇭";
  if (asset.country === "FR" || asset.country === "France") return "🇫🇷";
  if (asset.country === "IN" || asset.country === "India") return "🇮🇳";
  return asset.symbol.replace(/^c/, "").slice(0, 2);
}

function formatUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: value >= 100 ? 2 : 2,
    style: "currency",
  }).format(value);
}
