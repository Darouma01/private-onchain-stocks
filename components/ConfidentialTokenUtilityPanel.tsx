"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { useConfidentialAccess, vipBalanceThreshold } from "@/components/useConfidentialAccess";

export function ConfidentialTokenUtilityPanel() {
  const [checkedVip, setCheckedVip] = useState(false);
  const {
    hasEncryptedBalance,
    encryptedBalance,
    revealedBalance,
    revealBalance,
    revealLoading,
    revealError,
    isVip,
  } = useConfidentialAccess();

  async function checkVipTier() {
    setCheckedVip(true);
    await revealBalance();
  }

  const holderStatus = hasEncryptedBalance ? "Unlocked" : "Locked";
  const vipStatus = !checkedVip
    ? "Private"
    : isVip
      ? "VIP unlocked"
      : "Standard tier";

  return (
    <section className="section utility-section">
      <div className="row">
        <div>
          <h2>Confidential Token Utility</h2>
          <p className="muted">ccAAPL is the working asset for private payments, holder access, collateral, and rewards.</p>
        </div>
        <span className={`status-dot ${hasEncryptedBalance ? "good" : "blocked"}`}>{holderStatus}</span>
      </div>

      <div className="metric-grid">
        <UtilityCard
          title="Private Payments"
          status={hasEncryptedBalance ? "Ready" : "Wrap required"}
          text="Confidential transfers settle stock trades between verified investors while on-chain amounts remain encrypted."
        />
        <UtilityCard
          title="Access Control"
          status={hasEncryptedBalance ? "Dashboard unlocked" : "Holder gate closed"}
          text="Investor dashboard tools require a non-zero encrypted ccAAPL balance handle before they render."
        />
        <UtilityCard
          title="In-App Currency"
          status={hasEncryptedBalance ? "Collateral eligible" : "No collateral"}
          text="Wrapped stock balances are treated as private collateral for protocol workflows and future DeFi integrations."
        />
        <UtilityCard
          title="Rewards"
          status={hasEncryptedBalance ? "Dividend eligible" : "Not eligible"}
          text="Confidential dividend rewards can be distributed as encrypted amounts that only recipients can decrypt."
        />
      </div>

      <div className="action-panel">
        <div>
          <strong>Private VIP tier</strong>
          <p className="muted">
            Reveal your balance only to this wallet session to check the {formatEther(vipBalanceThreshold)} ccAAPL VIP
            threshold. The public dashboard never displays another investor's confidential balance.
          </p>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="muted">Encrypted balance handle</span>
            <strong className="handle-text">{hasEncryptedBalance && encryptedBalance ? `${encryptedBalance.slice(0, 10)}...` : "None"}</strong>
          </div>
          <div className="metric">
            <span className="muted">VIP access</span>
            <strong>{vipStatus}</strong>
          </div>
        </div>
        <button disabled={!hasEncryptedBalance || revealLoading} onClick={() => void checkVipTier()}>
          {revealLoading ? "Checking..." : "Check Private VIP Tier"}
        </button>
        {checkedVip && revealedBalance !== undefined ? (
          <p className="success">
            Private balance checked: {formatEther(revealedBalance)} ccAAPL.{" "}
            {isVip ? "VIP dashboard tier is unlocked." : "Standard holder dashboard tier is active."}
          </p>
        ) : null}
        {revealError ? <p className="error">{revealError.message}</p> : null}
      </div>
    </section>
  );
}

function UtilityCard({ title, status, text }: { title: string; status: string; text: string }) {
  return (
    <div className="metric utility-card">
      <span className="muted">{title}</span>
      <strong>{status}</strong>
      <p>{text}</p>
    </div>
  );
}
