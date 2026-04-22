"use client";

import { useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { AssetContextPill } from "@/components/AssetContextPill";
import { confidentialWrapperAbi } from "@/lib/contracts";
import { type DeployedAsset } from "@/lib/deployed-assets";
import { useConfidentialHoldings } from "@/hooks/useConfidentialHoldings";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";
import { getUtilityText } from "@/lib/utilities/getUtilityText";

export function ConfidentialTokenUtilityPanel() {
  const [checkedVip, setCheckedVip] = useState(false);
  const { address } = useAccount();
  const { selectedAsset, setSelectedAsset } = useSelectedAsset();
  const { holdsSelectedAsset, selectedHandle, userTier, tierLabel, totalAssetsHeld } = useConfidentialHoldings(address, selectedAsset.symbol);
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

  const revealedBalance = reveal.data;
  const isVip = typeof revealedBalance === "bigint" && revealedBalance >= vipBalanceThreshold;

  async function checkVipTier() {
    setCheckedVip(true);
    await reveal.refetch();
  }

  const holderStatus = holdsSelectedAsset ? "Unlocked" : "Locked";
  const vipStatus = !checkedVip
    ? "Private"
    : isVip
      ? "VIP unlocked"
      : "Standard tier";
  const utilityCopy = buildUtilityCopy(selectedAsset, text, Boolean(address), holdsSelectedAsset, userTier, tierLabel);

  return (
    <section className="section utility-section">
      <AssetContextPill selectedAsset={selectedAsset} onChange={setSelectedAsset} />

      <div className="row">
        <div>
          <h2>Confidential Token Utility</h2>
          <p className="muted">{text.sectionDescription}</p>
        </div>
        <span className={`status-dot ${holdsSelectedAsset ? "good" : "blocked"}`}>{holderStatus}</span>
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
            <strong className="handle-text">{selectedHandle ? `${selectedHandle.slice(0, 10)}...${selectedHandle.slice(-6)}` : "None"}</strong>
          </div>
          <div className="metric">
            <span className="muted">VIP access</span>
            <strong>{vipStatus}</strong>
          </div>
          <div className="metric">
            <span className="muted">Holder tier</span>
            <strong>{address ? tierLabel : "Connect wallet"}</strong>
            <p>{totalAssetsHeld} confidential assets held</p>
          </div>
        </div>
        <button disabled={!selectedHandle || reveal.isLoading} onClick={() => void checkVipTier()}>
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
  isConnected: boolean,
  holdsSelected: boolean,
  userTier: number,
  tierLabel: string,
): UtilityCardData[] {
  return [
    {
      icon: "🔒",
      title: "Private Payments",
      status: !isConnected ? "Connect wallet" : holdsSelected ? "Active ✅" : `Wrap ${asset.symbol} to activate`,
      text: text.privatePayments,
    },
    {
      icon: "🚪",
      title: "Access Control",
      status: !isConnected ? "Connect wallet" : userTier === 0 ? "Holder gate closed" : `${tierLabel} — Unlocked`,
      text: userTier > 0 ? `${text.accessControl} Private transfers, dividend eligibility, and governance voting unlock with holder status.` : text.accessControl,
    },
    {
      icon: "🎁",
      title: "Rewards / Dividends",
      status: holdsSelected ? "Eligible ✅" : "Not eligible",
      text: text.rewards,
    },
    {
      icon: "🗳️",
      title: "Governance",
      status: !isConnected ? "Connect wallet" : userTier === 0 ? `Hold ${asset.symbol} to vote` : "Eligible to vote ✅",
      text: text.governance,
    },
    {
      icon: "🏦",
      title: "In-App Currency / Collateral",
      status: holdsSelected ? "Available to lock ✅" : "No collateral",
      text: text.collateral,
    },
  ];
}

function vipThresholdFor(asset: DeployedAsset) {
  return parseEther(getUtilityText(asset).vipThreshold.replace(",", ""));
}
