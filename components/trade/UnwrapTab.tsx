"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { confidentialWrapperAbi, deployedNoxExecutorAddress, txUrl } from "@/lib/contracts";
import { categoryLabels, deployedAssetCategories, deployedAssets, type DeployedAsset } from "@/lib/deployed-assets";
import { useRevealBalance } from "@/hooks/useRevealBalance";
import { TransactionResult, TransactionSteps } from "@/components/trade/TradeShared";
import { errorMessage, safeParseTokenAmount, type TradeStep, type TradeTabProps } from "@/components/trade/tradeTypes";

const emptyHandle = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function UnwrapTab({ selectedAsset, setSelectedSymbol }: TradeTabProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [pending, setPending] = useState(false);
  const amountWei = useMemo(() => safeParseTokenAmount(amount), [amount]);
  const heldConfidentialAssets = useHeldConfidentialAssets(address);
  const heldAssets = heldConfidentialAssets.assets;
  const selectedHeldAsset = heldAssets.find((item) => item.asset.symbol === selectedAsset.symbol);
  const selectedHandle = selectedHeldAsset?.handle;
  const reveal = useRevealBalance({
    assetSymbol: selectedAsset.symbol,
    owner: address,
    wrapperAddress: selectedAsset.wrapperAddress,
  });

  useEffect(() => {
    reveal.resetReveal();
    setError(null);
    setHash(undefined);
  }, [reveal.resetReveal, selectedAsset.symbol]);

  useEffect(() => {
    if (!isConnected || heldAssets.length === 0) return;
    if (!selectedHeldAsset) setSelectedSymbol(heldAssets[0].asset.symbol);
  }, [heldAssets, isConnected, selectedHeldAsset, setSelectedSymbol]);

  useEffect(() => {
    if (reveal.revealedBalanceFormatted) setAmount(trimFormattedAmount(reveal.revealedBalanceFormatted));
  }, [reveal.revealedBalanceFormatted]);

  async function unwrap() {
    if (!isConnected) {
      setError("Connect wallet before unwrapping.");
      return;
    }
    if (!amountWei) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setPending(true);
    setError(null);
    setHash(undefined);
    try {
      const response = await fetch("/api/demo/create-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountWei.toString(), noxAddress: deployedNoxExecutorAddress }),
      });
      const payload = (await response.json()) as { error?: string; handle?: `0x${string}` };
      if (!response.ok || !payload.handle) throw new Error(payload.error ?? "Unable to create encrypted amount handle");

      const unwrapHash = await writeContractAsync({
        address: selectedAsset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "unwrap",
        args: [payload.handle, "0x"],
      });
      setHash(unwrapHash);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const steps = useMemo<TradeStep[]>(
    () => [
      {
        label: "Reveal Balance",
        status: reveal.phase === "success" ? "success" : reveal.isPending ? "pending" : reveal.phase === "error" ? "error" : "idle",
      },
      { label: "Approve Unwrap", status: pending ? "pending" : "idle" },
      { label: "Unwrap Confirmed", status: hash ? "success" : pending ? "pending" : "idle" },
    ],
    [hash, pending, reveal.isPending, reveal.phase],
  );

  if (!isConnected) {
    return (
      <div className="trade-form-card">
        <HeldAssetSelect
          heldAssets={heldAssets}
          isLoading={heldConfidentialAssets.isLoading}
          onChange={setSelectedSymbol}
          selectedSymbol={selectedAsset.symbol}
        />
        <div className="empty-state compact">
          <h3>Connect wallet to unwrap confidential assets.</h3>
          <p>Your encrypted balance handles load after wallet connection.</p>
        </div>
      </div>
    );
  }

  if (heldConfidentialAssets.isLoading) {
    return (
      <div className="trade-form-card">
        <HeldAssetSelect
          heldAssets={heldAssets}
          isLoading
          onChange={setSelectedSymbol}
          selectedSymbol={selectedAsset.symbol}
        />
        <div className="empty-state compact">
          <h3>Loading confidential assets...</h3>
          <p>Checking encrypted balance handles across all deployed wrappers.</p>
        </div>
      </div>
    );
  }

  if (!heldAssets.length) {
    return (
      <div className="trade-form-card">
        <HeldAssetSelect
          heldAssets={heldAssets}
          isLoading={false}
          onChange={setSelectedSymbol}
          selectedSymbol={selectedAsset.symbol}
        />
        <div className="empty-state compact">
          <h3>No confidential assets to unwrap.</h3>
          <p>Wrap an asset first in the Wrap tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trade-form-card">
      <HeldAssetSelect
        heldAssets={heldAssets}
        isLoading={false}
        onChange={setSelectedSymbol}
        selectedSymbol={selectedAsset.symbol}
      />
      <RevealBalanceCard
        asset={selectedAsset}
        handle={selectedHandle}
        onHide={reveal.resetReveal}
        onReveal={() => void reveal.revealBalance()}
        reveal={reveal}
      />
      <TransactionSteps steps={steps} />
      <div className="trade-amount-box">
        <label htmlFor="unwrap-amount">Amount</label>
        <input id="unwrap-amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
      </div>
      <button disabled={!isConnected || !amountWei || pending} onClick={() => void unwrap()} type="button">
        {pending ? "Unwrapping..." : "Unwrap to Standard ERC-20"}
      </button>
      <TransactionResult error={error} hash={hash} successText={`${selectedAsset.symbol} unwrapped to standard token`} />
    </div>
  );
}

function useHeldConfidentialAssets(owner?: `0x${string}`) {
  const balances = useReadContracts({
    contracts: deployedAssets.map((asset) => ({
      address: asset.wrapperAddress,
      abi: confidentialWrapperAbi,
      functionName: "getEncryptedBalance",
      args: owner ? [owner] : undefined,
    })),
    query: { enabled: Boolean(owner) },
  });

  const assets = useMemo(
    () =>
      deployedAssets.flatMap((asset, index) => {
        const handle = balances.data?.[index]?.result as `0x${string}` | undefined;
        if (!handle || handle === emptyHandle) return [];
        return [{ asset, handle }];
      }),
    [balances.data],
  );

  return {
    assets,
    isLoading: balances.isLoading,
  };
}

function HeldAssetSelect({
  heldAssets,
  isLoading,
  onChange,
  selectedSymbol,
}: {
  heldAssets: { asset: DeployedAsset; handle: `0x${string}` }[];
  isLoading: boolean;
  onChange: (symbol: string) => void;
  selectedSymbol: string;
}) {
  return (
    <label className="trade-asset-select">
      Confidential asset
      <select disabled={heldAssets.length === 0} onChange={(event) => onChange(event.target.value)} value={selectedSymbol}>
        {heldAssets.length === 0 ? (
          <option value={selectedSymbol}>{isLoading ? "Loading encrypted balances..." : "No confidential assets held"}</option>
        ) : (
          deployedAssetCategories.map((category) => {
            const assets = heldAssets.filter((item) => item.asset.category === category);
            if (assets.length === 0) return null;
            return (
              <optgroup key={category} label={categoryLabels[category]}>
                {assets.map(({ asset, handle }) => (
                  <option key={asset.symbol} value={asset.symbol}>
                    {asset.symbol} · {asset.name} · {categoryLabels[asset.category]} · {asset.requiresKYC ? "KYC" : "Open"} · Encrypted balance:{" "}
                    {shortHandle(handle)}
                  </option>
                ))}
              </optgroup>
            );
          })
        )}
      </select>
    </label>
  );
}

function RevealBalanceCard({
  asset,
  handle,
  onHide,
  onReveal,
  reveal,
}: {
  asset: DeployedAsset;
  handle?: `0x${string}`;
  onHide: () => void;
  onReveal: () => void;
  reveal: ReturnType<typeof useRevealBalance>;
}) {
  if (reveal.phase === "success" && reveal.revealedBalanceFormatted) {
    return (
      <div className="revealed-balance-card">
        <div>
          <span>🔓 Revealed Balance</span>
          <strong>
            {trimFormattedAmount(reveal.revealedBalanceFormatted)} {asset.symbol}
          </strong>
          <p>🔒 This balance is visible to you only for this browser session. It is never stored or transmitted.</p>
        </div>
        {reveal.txHash ? (
          <a href={txUrl(reveal.txHash)} rel="noreferrer" target="_blank">
            View tx: {shortHandle(reveal.txHash)}
          </a>
        ) : null}
        <button className="ghost-button" onClick={onHide} type="button">
          🔒 Hide balance
        </button>
      </div>
    );
  }

  const label =
    reveal.phase === "pending"
      ? "⏳ Reading confidential balance..."
      : reveal.phase === "error"
        ? "❌ Reveal failed — Try again"
        : "Reveal encrypted balance";

  return (
    <div className="encrypted-reveal-card">
      <div>
        <span className="muted">Encrypted balance handle</span>
        <strong className="handle-text">{handle ? shortHandle(handle) : "None"}</strong>
        <p>Your encrypted on-chain balance. The current demo wrapper exposes balance reveal through a read-only Nox disclosure call.</p>
      </div>
      <button className="ghost-button" disabled={!handle || reveal.isPending} onClick={onReveal} type="button">
        {label}
      </button>
      {reveal.phase === "pending" ? (
        <p className="muted">
          Transaction submitted — waiting for TEE confirmation.{" "}
          {reveal.txHash ? (
            <a href={txUrl(reveal.txHash)} rel="noreferrer" target="_blank">
              View on Arbiscan
            </a>
          ) : null}
        </p>
      ) : null}
      {reveal.error ? <p className="error">{reveal.error}</p> : null}
    </div>
  );
}

function shortHandle(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function trimFormattedAmount(value: string) {
  const trimmed = value.replace(/\.?0+$/, "");
  return trimmed || "0";
}
