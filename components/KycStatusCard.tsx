"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { addressUrl, identityRegistryAbi } from "@/lib/contracts";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";

const identityRegistryAddress = "0xb2afb921aa8ce9f53f678782840216661f0d849d" as const;
const personaTemplateId = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID ?? "TEMPLATE_ID";

type PersonaStatus = {
  country: string | null;
  status: "pending" | "verified";
  verified: boolean;
};

export function KycStatusCard() {
  const { address, isConnected } = useAccount();
  const { selectedAsset } = useSelectedAsset();
  const [personaStatus, setPersonaStatus] = useState<PersonaStatus | null>(null);
  const { data, isLoading, error, refetch } = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "isVerified",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && selectedAsset.requiresKYC) },
  });
  const country = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "investorCountry",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && selectedAsset.requiresKYC && data) },
  });

  useEffect(() => {
    setPersonaStatus(null);
  }, [address, selectedAsset.symbol]);

  useEffect(() => {
    if (!address || !selectedAsset.requiresKYC || data) return;
    let cancelled = false;

    async function pollStatus() {
      try {
        const response = await fetch(`/api/kyc/status?address=${address}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as PersonaStatus;
        if (!cancelled) setPersonaStatus(payload);
      } catch {
        // Persona polling is additive; the on-chain registry read remains the source of truth.
      }
    }

    void pollStatus();
    const interval = window.setInterval(() => void pollStatus(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [address, data, selectedAsset.requiresKYC, selectedAsset.symbol]);

  const personaUrl = useMemo(() => {
    const url = new URL("https://withpersona.com/verify");
    url.searchParams.set("inquiry-template-id", personaTemplateId);
    if (address) url.searchParams.set("reference-id", address);
    return url.toString();
  }, [address]);

  if (!selectedAsset.requiresKYC) {
    return (
      <section className="section status-section">
        <div className="row">
          <div>
            <h2>KYC Status</h2>
            <p className="muted">
              {selectedAsset.symbol} is open — no KYC required for this asset. Connect your wallet to start wrapping.
            </p>
          </div>
          <span className="status-dot good">Open</span>
        </div>
      </section>
    );
  }

  const registryVerified = Boolean(data);
  const personaVerified = Boolean(personaStatus?.verified);
  const verified = registryVerified || personaVerified;
  const countryFlag = registryVerified ? countryFlagFromCode(country.data) : countryFlagFromText(personaStatus?.country);

  let label = "Not connected";
  let description = `Connect your wallet to check whether it is approved for ${selectedAsset.symbol}.`;
  let className = "neutral";

  if (isConnected && isLoading) {
    label = "Checking";
    description = `Reading your KYC status for ${selectedAsset.symbol} from the ERC-3643 identity registry.`;
  } else if (verified) {
    label = "Verified";
    description = `✅ KYC Verified — Eligible for ${selectedAsset.symbol}${countryFlag ? ` ${countryFlag}` : ""}`;
    className = "good";
  } else if (isConnected) {
    label = "Not verified";
    description = `❌ Not KYC verified for ${selectedAsset.symbol}`;
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
        {isConnected && !verified ? (
          <a className="button-link persona-button" href={personaUrl} rel="noreferrer" target="_blank">
            Verify Identity with Persona →
          </a>
        ) : null}
        {isConnected && verified ? <span className="kyc-country">Verified country {countryFlag || "recorded"}</span> : null}
        {error ? <p className="error">{error.message}</p> : null}
      </div>
    </section>
  );
}

function countryFlagFromCode(code?: number) {
  const countryByIsoNumeric: Record<number, string> = {
    36: "AU",
    76: "BR",
    124: "CA",
    156: "CN",
    250: "FR",
    276: "DE",
    356: "IN",
    392: "JP",
    410: "KR",
    528: "NL",
    756: "CH",
    826: "GB",
    840: "US",
  };
  return countryFlagFromText(code ? countryByIsoNumeric[code] : undefined);
}

function countryFlagFromText(country?: string | null) {
  if (!country) return "";
  const normalized = country.trim().toUpperCase();
  const code = normalized.length === 2 ? normalized : normalized.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return code
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}
