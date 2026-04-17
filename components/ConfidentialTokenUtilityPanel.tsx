"use client";

import { useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { AssetCategory } from "@/deploy/assets.config";
import { AssetContextPill } from "@/components/AssetContextPill";
import { useAnyConfidentialBalance, useSelectedConfidentialBalance } from "@/components/useAnyConfidentialBalance";
import { confidentialWrapperAbi } from "@/lib/contracts";
import { deployedAssets, type DeployedAsset } from "@/lib/deployed-assets";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";

export function ConfidentialTokenUtilityPanel() {
  const [checkedVip, setCheckedVip] = useState(false);
  const { address } = useAccount();
  const { selectedAsset, setSelectedAsset } = useSelectedAsset();
  const selectedBalance = useSelectedConfidentialBalance(selectedAsset);
  const anyBalance = useAnyConfidentialBalance(deployedAssets);
  const vipBalanceThreshold = useMemo(() => vipThresholdFor(selectedAsset), [selectedAsset]);
  const reveal = useReadContract({
    address: selectedAsset.wrapperAddress,
    abi: confidentialWrapperAbi,
    functionName: "decryptBalance",
    args: address ? [address, "0x"] : undefined,
    account: address,
    query: { enabled: false },
  });

  const hasEncryptedBalance = selectedBalance.hasSelectedAssetBalance;
  const hasAnyBalance = anyBalance.hasAnyConfidentialBalance;
  const encryptedBalance = selectedBalance.encryptedBalance;
  const revealedBalance = reveal.data;
  const isVip = typeof revealedBalance === "bigint" && revealedBalance >= vipBalanceThreshold;
  const tierStatus = isVip ? "Tier 3" : hasEncryptedBalance ? "Tier 2" : hasAnyBalance ? "Tier 1" : "None";

  async function checkVipTier() {
    setCheckedVip(true);
    await reveal.refetch();
  }

  const holderStatus = hasEncryptedBalance ? "Unlocked" : "Locked";
  const vipStatus = !checkedVip
    ? "Private"
    : isVip
      ? "VIP unlocked"
      : "Standard tier";
  const utilityCopy = buildUtilityCopy(selectedAsset, hasEncryptedBalance, hasAnyBalance, tierStatus);

  return (
    <section className="section utility-section">
      <AssetContextPill selectedAsset={selectedAsset} onChange={setSelectedAsset} />

      <div className="row">
        <div>
          <h2>Confidential Token Utility</h2>
          <p className="muted">
            {selectedAsset.symbol} is the active confidential asset for private payments, holder access, rewards,
            governance, and collateral.
          </p>
        </div>
        <span className={`status-dot ${hasEncryptedBalance ? "good" : "blocked"}`}>{holderStatus}</span>
      </div>

      <div className="metric-grid">
        {utilityCopy.map((item) => <UtilityCard key={item.title} {...item} />)}
      </div>

      <div className="action-panel">
        <div>
          <strong>Private {selectedAsset.symbol} VIP Tier</strong>
          <p className="muted">
            Reveal your {selectedAsset.symbol} balance only to this wallet session to check the{" "}
            {formatThreshold(vipBalanceThreshold)} {selectedAsset.symbol} VIP threshold. The public dashboard never
            displays another investor&apos;s confidential balance.
          </p>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="muted">Encrypted {selectedAsset.symbol} balance handle</span>
            <strong className="handle-text">{hasEncryptedBalance && encryptedBalance ? `${encryptedBalance.slice(0, 10)}...` : "None"}</strong>
          </div>
          <div className="metric">
            <span className="muted">VIP access</span>
            <strong>{vipStatus}</strong>
          </div>
        </div>
        <button disabled={!hasEncryptedBalance || reveal.isLoading} onClick={() => void checkVipTier()}>
          {reveal.isLoading ? "Checking..." : `Check ${selectedAsset.symbol} VIP Tier`}
        </button>
        {checkedVip && revealedBalance !== undefined ? (
          <p className="success">
            Private balance checked: {formatEther(revealedBalance)} {selectedAsset.symbol}.{" "}
            {isVip ? "VIP dashboard tier is unlocked." : "Standard holder dashboard tier is active."}
          </p>
        ) : null}
        {reveal.error ? <p className="error">{reveal.error.message}</p> : null}
      </div>
    </section>
  );
}

function UtilityCard({ icon, title, status, text }: { icon: string; title: string; status: string; text: string }) {
  return (
    <div className="metric utility-card">
      <span className="utility-icon" aria-hidden="true">{icon}</span>
      <span className="muted">{title}</span>
      <strong>{status}</strong>
      <p>{text}</p>
    </div>
  );
}

type UtilityCardData = {
  icon: string;
  title: string;
  status: string;
  text: string;
};

function buildUtilityCopy(asset: DeployedAsset, holdsSelected: boolean, holdsAny: boolean, tierStatus: string): UtilityCardData[] {
  return [
    {
      icon: "🔒",
      title: "Private Payments",
      status: holdsSelected ? "Active ✅" : holdsAny ? `Wrap ${asset.symbol} to activate` : "Wrap required",
      text: privatePaymentText(asset),
    },
    {
      icon: "🚪",
      title: "Access Control",
      status:
        tierStatus === "Tier 3"
          ? "Institutional Access 🥇"
          : tierStatus === "Tier 2"
            ? "Premium Access 🥈"
            : tierStatus === "Tier 1"
              ? "Basic Access 🥉"
              : "Holder gate closed",
      text: accessControlText(asset),
    },
    {
      icon: "🎁",
      title: "Rewards / Dividends",
      status: holdsSelected ? "Eligible — awaiting distribution" : "Not eligible",
      text: rewardsText(asset),
    },
    {
      icon: "🗳️",
      title: "Governance",
      status: holdsSelected ? "Eligible to vote" : `Hold ${asset.symbol} to vote`,
      text: governanceText(asset),
    },
    {
      icon: "🏦",
      title: "In-App Currency / Collateral",
      status: holdsSelected ? "Available to lock" : "No collateral",
      text: collateralText(asset),
    },
  ];
}

function privatePaymentText(asset: DeployedAsset) {
  if (isStock(asset)) {
    return `Confidential ${asset.symbol} transfers settle equity trades between verified investors while on-chain amounts remain encrypted.`;
  }
  if (asset.category === AssetCategory.CRYPTO) {
    return `Transfer ${asset.symbol} privately between wallets — transaction amounts never appear in plaintext on-chain.`;
  }
  if (asset.category === AssetCategory.COMMODITY) {
    return `Settle ${asset.symbol} commodity positions confidentially with hidden transfer amounts.`;
  }
  return `Send ${asset.symbol} payments privately — ideal for confidential payroll, OTC settlement, and private fund transfers.`;
}

function accessControlText(asset: DeployedAsset) {
  if (isStock(asset)) {
    return `Hold ${asset.symbol} to unlock institutional investor tools, private data rooms, and tier-gated analytics.`;
  }
  if (asset.category === AssetCategory.CRYPTO) {
    return `Hold ${asset.symbol} to access advanced trading features, private alpha channels, and tier-gated protocol insights.`;
  }
  if (asset.category === AssetCategory.COMMODITY) {
    return `Hold ${asset.symbol} to access commodity market intelligence, private OTC desk, and institutional pricing.`;
  }
  return `Hold ${asset.symbol} to access yield optimization tools, private lending rates, and treasury management features.`;
}

function rewardsText(asset: DeployedAsset) {
  if (isStock(asset)) {
    return `Earn confidential ${asset.symbol} dividends distributed as encrypted amounts — only you can decrypt and reveal what you received.`;
  }
  if (asset.category === AssetCategory.CRYPTO) {
    return `Earn confidential staking rewards on ${asset.symbol} — reward amounts stay private until you choose to reveal them.`;
  }
  if (asset.category === AssetCategory.COMMODITY) {
    return `Earn confidential yield on ${asset.symbol} positions — settlement amounts encrypted and only visible to you.`;
  }
  return `Earn confidential yield on ${asset.symbol} — interest distributions are encrypted and private to each holder.`;
}

function governanceText(asset: DeployedAsset) {
  if (isStock(asset)) {
    return `Vote on ${asset.symbol} protocol decisions — fee changes, new listings, and compliance rules — using your confidential holdings as private voting weight.`;
  }
  if (asset.category === AssetCategory.CRYPTO) {
    return `Participate in ${asset.symbol} protocol governance with private votes. Your voting weight and direction are never revealed until the proposal closes.`;
  }
  if (asset.category === AssetCategory.COMMODITY) {
    return `Shape ${asset.symbol} market parameters through confidential governance — vote on settlement rules and oracle configurations.`;
  }
  return `Vote on ${asset.symbol} peg mechanisms, yield strategies, and treasury decisions with confidential voting weight.`;
}

function collateralText(asset: DeployedAsset) {
  if (isStock(asset)) {
    return `Use ${asset.symbol} as confidential collateral to borrow stablecoins privately — your collateral amount is never exposed on-chain.`;
  }
  if (asset.category === AssetCategory.CRYPTO) {
    return `Lock ${asset.symbol} as private collateral for borrowing — your position size stays confidential while remaining fully DeFi composable.`;
  }
  if (asset.category === AssetCategory.COMMODITY) {
    return `Use ${asset.symbol} as confidential commodity collateral — borrow against your position without revealing your exposure size.`;
  }
  return `Use ${asset.symbol} as the settlement and borrowing currency across the protocol — preferred collateral asset for private loans.`;
}

function vipThresholdFor(asset: DeployedAsset) {
  if (asset.category === AssetCategory.CRYPTO && (asset.symbol === "cBTC" || asset.symbol === "cETH")) return parseEther("0.1");
  if (asset.category === AssetCategory.CRYPTO) return parseEther("100");
  if (asset.category === AssetCategory.COMMODITY && (asset.symbol === "cGOLD" || asset.symbol === "cSILVER")) return parseEther("10");
  if (asset.category === AssetCategory.COMMODITY) return parseEther("50");
  if (asset.category === AssetCategory.STABLECOIN) return parseEther("1000");
  return parseEther("50");
}

function formatThreshold(value: bigint) {
  const formatted = formatEther(value);
  return formatted.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function isStock(asset: DeployedAsset) {
  return asset.category === AssetCategory.STOCK_US || asset.category === AssetCategory.STOCK_INTL;
}
