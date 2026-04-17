"use client";

import type { ReactNode } from "react";
import { useConfidentialAccess } from "@/components/useConfidentialAccess";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";

type InvestorDashboardGateProps = {
  featureName: string;
  utility: string;
  children: ReactNode;
};

export function InvestorDashboardGate({ featureName, utility, children }: InvestorDashboardGateProps) {
  const { isConnected, encryptedLoading, hasHolderAccess, encryptedError } = useConfidentialAccess();
  const { selectedAsset } = useSelectedAsset();

  if (hasHolderAccess) {
    return <>{children}</>;
  }

  let message = lockedMessage(featureName, selectedAsset.symbol, selectedAsset.name);
  if (isConnected && encryptedLoading) {
    message = "Checking your confidential stock token handle before unlocking this feature.";
  } else if (isConnected) {
    message = `This feature is locked until this wallet holds confidential ${selectedAsset.symbol}.`;
  }

  return (
    <section className="section locked-section">
      <div>
        <h2>{featureName}</h2>
        <p className="muted">{utility}</p>
      </div>
      <div className="empty-state">
        <strong>Confidential token holder access required</strong>
        <p>{message}</p>
      </div>
      {encryptedError ? <p className="error">{encryptedError.message}</p> : null}
    </section>
  );
}

function lockedMessage(featureName: string, symbol: string, name: string) {
  if (featureName.includes("On-Chain Data")) {
    return `Connect a verified wallet and wrap ${symbol} into confidential ${symbol} to unlock ${symbol} insights.`;
  }
  if (featureName.includes("Auditor")) {
    return `Connect a verified wallet and wrap ${symbol} to unlock the ${symbol} contract auditor.`;
  }
  if (featureName.includes("LLM") || featureName.includes("Assistant")) {
    return `Connect a verified wallet and wrap ${symbol} to unlock the AI assistant for ${name}.`;
  }
  return `Connect a verified wallet and wrap ${symbol} into confidential ${symbol} to unlock this holder feature.`;
}
