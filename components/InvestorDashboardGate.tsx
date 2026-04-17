"use client";

import type { ReactNode } from "react";
import { useConfidentialAccess } from "@/components/useConfidentialAccess";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";
import { getUtilityText } from "@/lib/utilities/getUtilityText";

type InvestorDashboardGateProps = {
  featureName: string;
  utility: string;
  children: ReactNode;
};

export function InvestorDashboardGate({ featureName, utility, children }: InvestorDashboardGateProps) {
  const { isConnected, encryptedLoading, hasHolderAccess, encryptedError } = useConfidentialAccess();
  const { selectedAsset } = useSelectedAsset();
  const text = getUtilityText(selectedAsset);

  if (hasHolderAccess) {
    return <>{children}</>;
  }

  let message = lockedMessage(featureName, text);
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

function lockedMessage(featureName: string, text: ReturnType<typeof getUtilityText>) {
  if (featureName.includes("On-Chain Data")) {
    return text.insightsLocked;
  }
  if (featureName.includes("Auditor")) {
    return text.auditorLocked;
  }
  if (featureName.includes("LLM") || featureName.includes("Assistant")) {
    return text.assistantLocked;
  }
  return text.insightsLocked;
}
