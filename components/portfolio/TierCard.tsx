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
            <TierBadge tier={tier.label} /> {tier.icon}
          </strong>
        </div>
        <span className="tier-badge">{confidentialAssetCount} assets held confidentially</span>
      </div>
      <div className="tier-progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="muted">
        {next ? `${Math.max(0, next.threshold - confidentialAssetCount)} more assets to reach ${next.label}.` : "Institutional tier unlocked."}
      </p>
      <div className="tier-checklist">
        <span>✓ Confidential portfolio access</span>
        <span>✓ Transfer and unwrap workflows</span>
        <span className={confidentialAssetCount >= 5 ? "" : "locked"}>✓ Premium analytics tier</span>
        <span className={confidentialAssetCount >= 10 ? "" : "locked"}>✓ Tier 3 governance access</span>
        <span className={confidentialAssetCount >= 20 ? "" : "locked"}>✓ Institutional data room</span>
      </div>
    </div>
  );
}

function getTier(assetCount: number) {
  if (assetCount >= 20) return { label: "Institutional" as const, icon: "🏛️" };
  if (assetCount >= 10) return { label: "Tier 3" as const, icon: "🥇" };
  if (assetCount >= 5) return { label: "Tier 2" as const, icon: "🥈" };
  return { label: "Tier 1" as const, icon: "🥉" };
}

function nextTier(assetCount: number) {
  if (assetCount < 5) return { label: "Tier 2", threshold: 5 };
  if (assetCount < 10) return { label: "Tier 3", threshold: 10 };
  if (assetCount < 20) return { label: "Institutional", threshold: 20 };
  return null;
}
