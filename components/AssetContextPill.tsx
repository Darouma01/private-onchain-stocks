"use client";

import { AssetSelector, KYCBadge } from "@/components/SharedUi";
import { categoryLabels, type DeployedAsset } from "@/lib/deployed-assets";

export function AssetContextPill({
  onChange,
  selectedAsset,
}: {
  onChange: (symbol: string) => void;
  selectedAsset: DeployedAsset;
}) {
  return (
    <div className="asset-context-pill">
      <span>
        🔒 Viewing: {selectedAsset.symbol} — {selectedAsset.name} | {categoryLabels[selectedAsset.category]} |{" "}
        {selectedAsset.requiresKYC ? "KYC Required" : "Open"}
      </span>
      <KYCBadge status={selectedAsset.requiresKYC ? "Required" : "Open"} />
      <AssetSelector label="Change Asset" selectedSymbol={selectedAsset.symbol} onChange={onChange} />
    </div>
  );
}
