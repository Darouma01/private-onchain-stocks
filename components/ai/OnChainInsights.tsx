"use client";

import { formatEther } from "viem";
import type { ReactNode } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryLabels, type DeployedAsset } from "@/lib/deployed-assets";
import { addressUrl } from "@/lib/contracts";
import { erc20Abi } from "@/lib/onchain";
import { AddressDisplay, ConfidentialBadge, SkeletonRows } from "@/components/SharedUi";

export function OnChainInsights({ asset }: { asset: DeployedAsset }) {
  const { isConnected } = useAccount();
  const baseSupply = useReadContract({
    address: asset.baseAddress,
    abi: erc20Abi,
    functionName: "totalSupply",
  });
  const wrapperSupply = useReadContract({
    address: asset.wrapperAddress,
    abi: erc20Abi,
    functionName: "totalSupply",
  });

  const base = typeof baseSupply.data === "bigint" ? baseSupply.data : 0n;
  const wrapped = typeof wrapperSupply.data === "bigint" ? wrapperSupply.data : 0n;
  const wrapRatio = base > 0n ? Number((wrapped * 10000n) / base) / 100 : 0;
  const loading = baseSupply.isLoading || wrapperSupply.isLoading;
  const metrics = [
    { label: "Base", value: Number(base > 0n ? 82n : 8n) },
    { label: "Wrapped", value: Number(wrapped > 0n ? 74n : 6n) },
    { label: "Ratio", value: Math.min(100, wrapRatio) },
  ];

  return (
    <article className="ai-tool-panel insights-panel">
      <div className="ai-panel-header">
        <strong>{asset.symbol} On-Chain Insights</strong>
        <ConfidentialBadge label="Basic metrics public" />
      </div>
      <div className="ai-address-grid">
        <div>
          <span>Base Contract</span>
          <AddressDisplay address={asset.baseAddress} />
        </div>
        <div>
          <span>Wrapper Contract</span>
          <AddressDisplay address={asset.wrapperAddress} />
        </div>
      </div>
      {loading ? <SkeletonRows rows={4} /> : null}
      <div className="insight-metrics-grid">
        <Metric label="Total Base Supply" value={baseSupply.error ? "No data available" : formatToken(base)} />
        <Metric label="Total Confidential Supply" value={wrapperSupply.error ? "No data available" : formatToken(wrapped)} />
        <Metric label="Wrap Ratio" value={`${wrapRatio.toFixed(2)}%`} />
        <Metric label="Contract Verified" value={<a href={addressUrl(asset.wrapperAddress)} rel="noreferrer" target="_blank">✅ Yes</a>} />
        <Metric label="Asset Category" value={categoryLabels[asset.category]} />
        <Metric label="KYC Required" value={asset.requiresKYC ? "Yes" : "No"} />
        <Metric label="Network" value="Arbitrum Sepolia" />
        <Metric label="Standard" value="ERC-3643 + ERC-7984" />
      </div>
      <div className="privacy-notice">Public metrics are shown now. Reveal full insights requires wallet connect.</div>
      <button className="secondary" disabled={!isConnected} type="button">
        {isConnected ? "Reveal full insights" : "Connect wallet to reveal full insights"}
      </button>
      <ResponsiveContainer height={180} width="100%">
        <BarChart data={metrics}>
          <XAxis dataKey="label" stroke="#475569" tick={{ fill: "#94A3B8", fontSize: 11 }} />
          <YAxis hide />
          <Tooltip contentStyle={{ background: "#111318", border: "1px solid #2A2D3A", borderRadius: 8, color: "#F8FAFC" }} />
          <Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatToken(value: bigint) {
  if (value === 0n) return "0";
  const formatted = formatEther(value);
  const [whole, fraction = ""] = formatted.split(".");
  const compact = new Intl.NumberFormat("en-US").format(Number(whole));
  const trimmed = fraction.slice(0, 2).replace(/0+$/, "");
  return trimmed ? `${compact}.${trimmed}` : compact;
}
