"use client";

import { useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { confidentialWrapperAbi, deployedNoxExecutorAddress } from "@/lib/contracts";
import { EncryptedBalanceLine, TradeAssetSelect, TransactionResult } from "@/components/trade/TradeShared";
import { errorMessage, safeParseTokenAmount, type TradeTabProps } from "@/components/trade/tradeTypes";

export function TransferTab({ selectedAsset, setSelectedSymbol }: TradeTabProps) {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [pending, setPending] = useState(false);
  const amountWei = useMemo(() => safeParseTokenAmount(amount), [amount]);
  const recipientValid = isAddress(recipient);

  async function transfer() {
    if (!isConnected) {
      setError("Connect wallet before transferring.");
      return;
    }
    if (!amountWei || !recipientValid) {
      setError("Enter a valid recipient address and amount greater than zero.");
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
        address: selectedAsset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "confidentialTransfer",
        args: [recipient as `0x${string}`, payload.handle, "0x"],
      });
      setHash(transferHash);
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
      <label className="trade-field">
        Recipient address
        <input aria-invalid={recipient.length > 0 && !recipientValid} onChange={(event) => setRecipient(event.target.value)} placeholder="0x..." value={recipient} />
      </label>
      <div className={recipientValid || recipient.length === 0 ? "recipient-status ok" : "recipient-status bad"}>
        {recipient.length === 0 ? "Enter recipient wallet" : recipientValid ? "Recipient address valid" : "Enter a valid 0x address"}
      </div>
      <div className="trade-amount-box">
        <label htmlFor="transfer-amount">Amount</label>
        <input id="transfer-amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
      </div>
      <div className="privacy-notice">🔒 Amount hidden on-chain</div>
      <button disabled={!isConnected || !amountWei || !recipientValid || pending} onClick={() => void transfer()} type="button">
        {pending ? "Sending..." : "Send Confidential Transfer"}
      </button>
      <TransactionResult error={error} hash={hash} successText={`${selectedAsset.symbol} sent confidentially 🔒`} />
    </div>
  );
}
