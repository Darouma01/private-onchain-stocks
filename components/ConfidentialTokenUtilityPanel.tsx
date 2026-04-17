"use client";

import { useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { AssetContextPill } from "@/components/AssetContextPill";
import { useAnyConfidentialBalance, useSelectedConfidentialBalance } from "@/components/useAnyConfidentialBalance";
import { confidentialWrapperAbi } from "@/lib/contracts";
import { deployedAssets, type DeployedAsset } from "@/lib/deployed-assets";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";
import { getUtilityText } from "@/lib/utilities/getUtilityText";

export function ConfidentialTokenUtilityPanel() {
  const [checkedVip, setCheckedVip] = useState(false);
  const { address } = useAccount();
  const { selectedAsset, setSelectedAsset } = useSelectedAsset();
  const selectedBalance = useSelectedConfidentialBalance(selectedAsset);
  const anyBalance = useAnyConfidentialBalance(deployedAssets);
  const vipBalanceThreshold = useMemo(() => vipThresholdFor(selectedAsset), [selectedAsset]);
  const text = useMemo(() => getUtilityText(selectedAsset), [selectedAsset]);
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
  const utilityCopy = buildUtilityCopy(selectedAsset, text, hasEncryptedBalance, hasAnyBalance, tierStatus);

  return (
    <section className="section utility-section">
      <AssetContextPill selectedAsset={selectedAsset} onChange={setSelectedAsset} />

      <div className="row">
        <div>
          <h2>Confidential Token Utility</h2>
          <p className="muted">{text.sectionDescription}</p>
        </div>
        <span className={`status-dot ${hasEncryptedBalance ? "good" : "blocked"}`}>{holderStatus}</span>
      </div>

      <div className="metric-grid">
        {utilityCopy.map((item) => <UtilityCard key={item.title} {...item} />)}
      </div>

      <div className="action-panel">
        <div>
          <strong>{text.vipTitle}</strong>
          <p className="muted">{text.vipDescription}</p>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="muted">{text.encryptedBalanceLabel}</span>
            <strong className="handle-text">{hasEncryptedBalance && encryptedBalance ? `${encryptedBalance.slice(0, 10)}...` : "None"}</strong>
          </div>
          <div className="metric">
            <span className="muted">VIP access</span>
            <strong>{vipStatus}</strong>
          </div>
        </div>
        <button disabled={!hasEncryptedBalance || reveal.isLoading} onClick={() => void checkVipTier()}>
          {reveal.isLoading ? "Checking..." : text.vipButtonText}
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

function buildUtilityCopy(
  asset: DeployedAsset,
  text: ReturnType<typeof getUtilityText>,
  holdsSelected: boolean,
  holdsAny: boolean,
  tierStatus: string,
): UtilityCardData[] {
  return [
    {
      icon: "🔒",
      title: "Private Payments",
      status: holdsSelected ? "Active ✅" : holdsAny ? `Wrap ${asset.symbol} to activate` : "Wrap required",
      text: text.privatePayments,
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
      text: text.accessControl,
    },
    {
      icon: "🎁",
      title: "Rewards / Dividends",
      status: holdsSelected ? "Eligible — awaiting distribution" : "Not eligible",
      text: text.rewards,
    },
    {
      icon: "🗳️",
      title: "Governance",
      status: holdsSelected ? "Eligible to vote" : `Hold ${asset.symbol} to vote`,
      text: text.governance,
    },
    {
      icon: "🏦",
      title: "In-App Currency / Collateral",
      status: holdsSelected ? "Available to lock" : "No collateral",
      text: text.collateral,
    },
  ];
}

function vipThresholdFor(asset: DeployedAsset) {
  return parseEther(getUtilityText(asset).vipThreshold.replace(",", ""));
}
