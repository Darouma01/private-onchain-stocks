"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther, type Address } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { confidentialWrapperAbi, deployedNoxExecutorAddress, txUrl } from "@/lib/contracts";
import { useRevealBalance } from "@/hooks/useRevealBalance";
import { type ConfidentialHolding } from "@/hooks/useConfidentialHoldings";
import { errorMessage, safeParseTokenAmount } from "@/components/trade/tradeTypes";

export function UnwrapModal({
  holding,
  onClose,
  onComplete,
  revealedBalance,
}: {
  holding: ConfidentialHolding;
  onClose: () => void;
  onComplete: () => void;
  revealedBalance?: bigint;
}) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const reveal = useRevealBalance({
    assetSymbol: holding.asset.symbol,
    owner: address as Address | undefined,
    wrapperAddress: holding.asset.wrapperAddress,
  });
  const [amount, setAmount] = useState(revealedBalance ? formatEther(revealedBalance) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const amountWei = useMemo(() => safeParseTokenAmount(amount), [amount]);
  const activeRevealed = revealedBalance ?? reveal.revealedBalance ?? undefined;

  useEffect(() => {
    if (activeRevealed !== undefined) setAmount(formatEther(activeRevealed));
  }, [activeRevealed]);

  async function submit() {
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
        address: holding.asset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "unwrap",
        args: [payload.handle, "0x"],
      });
      setHash(unwrapHash);
      onComplete();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="asset-drawer-overlay" role="dialog" aria-modal="true" aria-label={`Unwrap ${holding.asset.symbol}`}>
      <aside className="asset-drawer transaction-modal">
        <div className="drawer-header">
          <h3>Unwrap {holding.asset.symbol}</h3>
          <button className="ghost-button close-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="trade-form-card modal-form">
          <div className="metric">
            <span className="muted">Encrypted handle</span>
            <strong>{holding.handle.slice(0, 10)}...{holding.handle.slice(-6)}</strong>
          </div>
          {activeRevealed === undefined ? (
            <>
              <div className="privacy-notice">Reveal balance first to pre-fill your unwrap amount.</div>
              <button disabled={reveal.isPending} onClick={() => void reveal.revealBalance()} type="button">
                {reveal.isPending ? "Decrypting..." : "Reveal Balance"}
              </button>
            </>
          ) : null}
          <label className="trade-field">
            Amount
            <input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
          </label>
          <button disabled={!amountWei || pending} onClick={() => void submit()} type="button">
            {pending ? "Unwrapping..." : "Unwrap to Standard ERC-20"}
          </button>
          {hash ? (
            <a href={txUrl(hash)} rel="noreferrer" target="_blank">
              View on Arbiscan
            </a>
          ) : null}
          {error || reveal.error ? <p className="error">{error ?? reveal.error}</p> : null}
        </div>
      </aside>
    </div>
  );
}
