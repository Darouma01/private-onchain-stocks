"use client";

import { TierBadge } from "@/components/SharedUi";

export function TierCard({ confidentialAssetCount }: { confidentialAssetCount: number }) {
  const tier = getTier(confidentialAssetCount);
  const next = nextTier(confidentialAssetCount);
  const progress = next ? Math.min(100, (confidentialAssetCount / next.threshold) * 100) : 100;

  return (
    <div className="tier-card">
      <div className="tier-card-header">
        <div>
          <span className="muted">Current tier</span>
          <strong>
            {tier.badge ? <TierBadge tier={tier.badge} /> : null} {tier.label} {tier.icon}
          </strong>
        </div>
        <span className="tier-badge">
          {confidentialAssetCount} / {next?.threshold ?? confidentialAssetCount} assets
        </span>
      </div>
      <div className="tier-progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="muted">
        {next ? `${Math.max(0, next.threshold - confidentialAssetCount)} more to reach ${next.label}.` : "Elite tier unlocked."}
      </p>
      <div className="tier-checklist">
        <span>✅ Private payments</span>
        <span>✅ Dividend access</span>
        <span className={confidentialAssetCount >= 5 ? "" : "locked"}>✅ Governance voting</span>
        <span className={confidentialAssetCount >= 10 ? "" : "locked"}>✅ Institutional data room</span>
        <span className={confidentialAssetCount >= 20 ? "" : "locked"}>✅ Elite portfolio access</span>
      </div>
    </div>
  );
}

function getTier(assetCount: number) {
  if (assetCount >= 20) return { label: "Elite", icon: "🏛️", badge: null };
  if (assetCount >= 10) return { label: "Institutional", icon: "🥇", badge: "Tier 3" as const };
  if (assetCount >= 5) return { label: "Premium", icon: "🥈", badge: "Tier 2" as const };
  return { label: "Basic", icon: "🥉", badge: "Tier 1" as const };
}

function nextTier(assetCount: number) {
  if (assetCount < 5) return { label: "Tier 2", threshold: 5 };
  if (assetCount < 10) return { label: "Institutional", threshold: 10 };
  if (assetCount < 20) return { label: "Elite", threshold: 20 };
  return null;
}
