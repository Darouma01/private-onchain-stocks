"use client";

import type { ReactNode } from "react";
import { useConfidentialAccess } from "@/components/useConfidentialAccess";

type InvestorDashboardGateProps = {
  featureName: string;
  utility: string;
  children: ReactNode;
};

export function InvestorDashboardGate({ featureName, utility, children }: InvestorDashboardGateProps) {
  const { isConnected, encryptedLoading, hasHolderAccess, encryptedError } = useConfidentialAccess();

  if (hasHolderAccess) {
    return <>{children}</>;
  }

  let message = "Connect a verified wallet and wrap a confidential asset to unlock this holder feature.";
  if (isConnected && encryptedLoading) {
    message = "Checking your confidential stock token handle before unlocking this feature.";
  } else if (isConnected) {
    message = "This feature is locked until this wallet holds a confidential asset.";
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
