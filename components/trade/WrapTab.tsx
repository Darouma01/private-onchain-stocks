"use client";

import { useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { baseAssetAbi, confidentialWrapperAbi } from "@/lib/contracts";
import { AssetPriceLine, BalanceLine, KycInlineStatus, TradeAssetSelect, TransactionResult, TransactionSteps } from "@/components/trade/TradeShared";
import type { TradeStep } from "@/components/trade/tradeTypes";
import { errorMessage, safeParseTokenAmount, type TradeTabProps } from "@/components/trade/tradeTypes";

export function WrapTab({ selectedAsset, setSelectedSymbol }: TradeTabProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [activeStep, setActiveStep] = useState<"idle" | "approve" | "wrap" | "confirmed" | "error">("idle");
  const amountWei = useMemo(() => safeParseTokenAmount(amount), [amount]);

  const balance = useReadContract({
    address: selectedAsset.baseAddress,
    abi: baseAssetAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const allowance = useReadContract({
    address: selectedAsset.baseAddress,
    abi: baseAssetAbi,
    functionName: "allowance",
    args: address ? [address, selectedAsset.wrapperAddress] : undefined,
    query: { enabled: Boolean(address) },
  });

  const steps: TradeStep[] = [
    { label: `Approve ${selectedAsset.symbol}`, status: stepStatus(activeStep, "approve") },
    { label: `Wrap to ${selectedAsset.symbol}`, status: stepStatus(activeStep, "wrap") },
    { label: "Confirmed 🔒", status: activeStep === "confirmed" ? "success" : activeStep === "error" ? "error" : "idle" },
  ];

  function setMax() {
    if (balance.data !== undefined) setAmount(formatEther(balance.data));
  }

  async function wrap() {
    if (!isConnected || !address) {
      setError("Connect wallet before wrapping.");
      return;
    }
    if (!amountWei) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!publicClient) {
      setError("Network client unavailable.");
      return;
    }

    setError(null);
    setHash(undefined);

    try {
      if ((allowance.data ?? 0n) < amountWei) {
        setActiveStep("approve");
        const approveHash = await writeContractAsync({
          address: selectedAsset.baseAddress,
          abi: baseAssetAbi,
          functionName: "approve",
          args: [selectedAsset.wrapperAddress, amountWei],
        });
        setHash(approveHash);
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await allowance.refetch();
      }

      setActiveStep("wrap");
      const wrapHash = await writeContractAsync({
        address: selectedAsset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "wrap",
        args: [amountWei, "0x"],
      });
      setHash(wrapHash);
      await publicClient.waitForTransactionReceipt({ hash: wrapHash });
      setActiveStep("confirmed");
      await Promise.all([balance.refetch(), allowance.refetch()]);
    } catch (caught) {
      setActiveStep("error");
      setError(errorMessage(caught));
    }
  }

  return (
    <div className="trade-form-card">
      <TradeAssetSelect label="Asset" selectedSymbol={selectedAsset.symbol} onChange={setSelectedSymbol} />
      <AssetPriceLine asset={selectedAsset} />
      <KycInlineStatus asset={selectedAsset} />
      <BalanceLine asset={selectedAsset} />
      <div className="trade-amount-box">
        <label htmlFor="wrap-amount">Amount</label>
        <div>
          <input id="wrap-amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
          <button className="ghost-button" onClick={setMax} type="button">
            MAX
          </button>
        </div>
      </div>
      <div className="privacy-notice">🔒 Your wrapped balance will be encrypted on-chain</div>
      <button disabled={!isConnected || !amountWei || activeStep === "approve" || activeStep === "wrap"} onClick={() => void wrap()} type="button">
        {activeStep === "approve" ? "Approving..." : activeStep === "wrap" ? "Wrapping..." : "Wrap to Confidential"}
      </button>
      <TransactionSteps steps={steps} />
      <TransactionResult error={error} hash={hash} successText="Your balance is now encrypted 🔒" />
    </div>
  );
}

function stepStatus(activeStep: "idle" | "approve" | "wrap" | "confirmed" | "error", step: "approve" | "wrap"): TradeStep["status"] {
  if (activeStep === "error" && step === "wrap") return "error";
  if (activeStep === step) return "pending";
  if (activeStep === "confirmed") return "success";
  if (step === "approve" && activeStep === "wrap") return "success";
  return "idle";
}
