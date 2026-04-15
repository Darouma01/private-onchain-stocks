"use client";

import { useAccount, useReadContract } from "wagmi";
import { addressUrl, identityRegistryAbi } from "@/lib/contracts";

const identityRegistryAddress = "0xb2afb921aa8ce9f53f678782840216661f0d849d" as const;

export function KycStatusCard() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, error, refetch } = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "isVerified",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  let label = "Not connected";
  let description = "Connect your wallet to check whether it is approved for cAAPL.";
  let className = "neutral";

  if (isConnected && isLoading) {
    label = "Checking";
    description = "Reading your KYC status from the ERC-3643 identity registry.";
  } else if (data) {
    label = "Verified";
    description = "This wallet can hold cAAPL, wrap ccAAPL, and receive private stock payments.";
    className = "good";
  } else if (isConnected) {
    label = "Not verified";
    description = "This wallet is not in the demo identity registry. Use a pre-approved demo wallet.";
    className = "blocked";
  }

  return (
    <section className="section status-section">
      <div className="row">
        <div>
          <h2>KYC Status</h2>
          <p className="muted">{description}</p>
        </div>
        <span className={`status-dot ${className}`}>{label}</span>
      </div>

      <div className="stack">
        <a href={addressUrl(identityRegistryAddress)} target="_blank" rel="noreferrer">
          View identity registry on Arbiscan
        </a>
        {isConnected ? (
          <button className="secondary" onClick={() => void refetch()}>
            Refresh KYC Status
          </button>
        ) : null}
        {error ? <p className="error">{error.message}</p> : null}
      </div>
    </section>
  );
}
