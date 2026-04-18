"use client";

import { useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { confidentialWrapperAbi, deployedNoxExecutorAddress } from "@/lib/contracts";
import { EncryptedBalanceLine, TradeAssetSelect, TransactionResult } from "@/components/trade/TradeShared";
import { errorMessage, safeParseTokenAmount, type TradeTabProps } from "@/components/trade/tradeTypes";

export function UnwrapTab({ selectedAsset, setSelectedSymbol }: TradeTabProps) {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [pending, setPending] = useState(false);
  const amountWei = useMemo(() => safeParseTokenAmount(amount), [amount]);

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

  return (
    <div className="trade-form-card">
      <TradeAssetSelect label="Confidential asset" selectedSymbol={selectedAsset.symbol} onChange={setSelectedSymbol} />
      <EncryptedBalanceLine asset={selectedAsset} />
      <button className="ghost-button" type="button">
        Reveal encrypted balance
      </button>
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
