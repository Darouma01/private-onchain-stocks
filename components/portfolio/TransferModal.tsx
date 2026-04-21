"use client";

import { formatEther, isAddress } from "viem";
import { useMemo, useState } from "react";
import { useWriteContract } from "wagmi";
import { confidentialWrapperAbi, deployedNoxExecutorAddress, txUrl } from "@/lib/contracts";
import { type ConfidentialHolding } from "@/hooks/useConfidentialHoldings";
import { errorMessage, safeParseTokenAmount } from "@/components/trade/tradeTypes";

export function TransferModal({
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
  const { writeContractAsync } = useWriteContract();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(revealedBalance ? formatEther(revealedBalance) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const amountWei = useMemo(() => safeParseTokenAmount(amount), [amount]);

  async function submit() {
    if (!amountWei || !isAddress(recipient)) {
      setError("Enter a valid recipient address and amount.");
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

      const transferHash = await writeContractAsync({
        address: holding.asset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "confidentialTransfer",
        args: [recipient as `0x${string}`, payload.handle, "0x"],
      });
      setHash(transferHash);
      onComplete();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="asset-drawer-overlay" role="dialog" aria-modal="true" aria-label={`Transfer ${holding.asset.symbol} privately`}>
      <aside className="asset-drawer transaction-modal">
        <div className="drawer-header">
          <h3>🔒 Transfer {holding.asset.symbol} Privately</h3>
          <button className="ghost-button close-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="trade-form-card modal-form">
          <div className="metric">
            <span className="muted">From</span>
            <strong>{holding.asset.name}</strong>
          </div>
          <label className="trade-field">
            To
            <input onChange={(event) => setRecipient(event.target.value)} placeholder="0x..." value={recipient} />
          </label>
          <label className="trade-field">
            Amount
            <input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
          </label>
          <div className="privacy-notice">
            🔒 Amount hidden on-chain {revealedBalance === undefined ? "· Reveal first to see balance" : ""}
          </div>
          <button disabled={!amountWei || !isAddress(recipient) || pending} onClick={() => void submit()} type="button">
            {pending ? "Sending..." : "Send Confidentially"}
          </button>
          {hash ? (
            <a href={txUrl(hash)} rel="noreferrer" target="_blank">
              View on Arbiscan
            </a>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
        </div>
      </aside>
    </div>
  );
}
