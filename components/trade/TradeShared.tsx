"use client";

import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { AssetCategory } from "@/deploy/assets.config";
import { deployedAssetCategories, deployedAssets, categoryLabels, type DeployedAsset } from "@/lib/deployed-assets";
import { baseAssetAbi, confidentialWrapperAbi, identityRegistryAbi, txUrl } from "@/lib/contracts";
import { getCachedAssetPrice } from "@/lib/prices/usePrices";
import type { TradeStep } from "@/components/trade/tradeTypes";

const identityRegistryAddress = "0xb2afb921aa8ce9f53f678782840216661f0d849d" as const;

export function TradeAssetSelect({
  label,
  onChange,
  selectedSymbol,
}: {
  label: string;
  onChange: (symbol: string) => void;
  selectedSymbol: string;
}) {
  return (
    <label className="trade-asset-select">
      {label}
      <select onChange={(event) => onChange(event.target.value)} value={selectedSymbol}>
        {deployedAssetCategories.map((category) => (
          <optgroup key={category} label={categoryLabels[category]}>
            {deployedAssets
              .filter((asset) => asset.category === category)
              .map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol} · {asset.name} · {asset.requiresKYC ? "KYC" : "Open"}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function AssetPriceLine({ asset }: { asset: DeployedAsset }) {
  const quote = getCachedAssetPrice(asset.symbol);
  return (
    <div className="trade-info-grid">
      <span>Current price</span>
      <strong>{quote ? `1 ${asset.symbol} = ${formatUsd(quote.price)}` : "Price unavailable"}</strong>
      <span>24h change</span>
      <strong className={(quote?.change24h ?? 0) >= 0 ? "change-up" : "change-down"}>
        {quote ? `${quote.change24h >= 0 ? "▲" : "▼"} ${Math.abs(quote.change24h).toFixed(2)}%` : "Unavailable"}
      </strong>
    </div>
  );
}

export function BalanceLine({ asset }: { asset: DeployedAsset }) {
  const { address } = useAccount();
  const balance = useReadContract({
    address: asset.baseAddress,
    abi: baseAssetAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  return (
    <div className="metric">
      <span className="muted">Your {asset.symbol} balance</span>
      <strong>{balance.data === undefined ? "Connect wallet" : `${formatEther(balance.data)} ${asset.symbol}`}</strong>
    </div>
  );
}

export function EncryptedBalanceLine({ asset }: { asset: DeployedAsset }) {
  const { address } = useAccount();
  const encryptedBalance = useReadContract({
    address: asset.wrapperAddress,
    abi: confidentialWrapperAbi,
    functionName: "getEncryptedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const handle = encryptedBalance.data;

  return (
    <div className="metric">
      <span className="muted">Encrypted balance handle</span>
      <strong className="handle-text">{handle ? `${handle.slice(0, 10)}...${handle.slice(-6)}` : "None"}</strong>
    </div>
  );
}

export function KycInlineStatus({ asset }: { asset: DeployedAsset }) {
  const { address } = useAccount();
  const verified = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "isVerified",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && asset.requiresKYC) },
  });
  const noKycRequired = asset.category === AssetCategory.CRYPTO || asset.category === AssetCategory.STABLECOIN;

  if (noKycRequired) return <div className="recipient-status ok">✅ No KYC Required</div>;
  if (!address) return <div className="recipient-status bad">❌ KYC Required — connect wallet</div>;
  if (verified.isLoading) return <div className="recipient-status neutral">Checking KYC status...</div>;
  return verified.data ? <div className="recipient-status ok">✅ KYC Verified</div> : <div className="recipient-status bad">❌ KYC Required — Verify Identity</div>;
}

export function TransactionSteps({ steps }: { steps: TradeStep[] }) {
  return (
    <div className="trade-steps">
      {steps.map((step) => (
        <span className={step.status === "pending" || step.status === "success" ? "active" : undefined} key={step.label}>
          {step.label} {step.status === "pending" ? "⏳" : step.status === "success" ? "✅" : step.status === "error" ? "❌" : ""}
        </span>
      ))}
    </div>
  );
}

export function TransactionResult({ error, hash, successText }: { error?: string | null; hash?: `0x${string}`; successText: string }) {
  if (!error && !hash) return null;

  return (
    <div className={error ? "action-feedback error" : "action-feedback success"}>
      <strong>{error ? "Transaction failed" : successText}</strong>
      {error ? <p>{error}</p> : null}
      {hash ? (
        <a href={txUrl(hash)} rel="noreferrer" target="_blank">
          View transaction on Arbiscan
        </a>
      ) : null}
    </div>
  );
}

export function formatUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: value >= 100 ? 2 : 2,
    style: "currency",
  }).format(value);
}
