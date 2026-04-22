"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { baseAssetAbi, confidentialWrapperAbi, identityRegistryAbi } from "@/lib/contracts";
import { AssetPriceLine, BalanceLine, KycInlineStatus, TradeAssetSelect, TransactionResult, TransactionSteps } from "@/components/trade/TradeShared";
import type { TradeStep } from "@/components/trade/tradeTypes";
import { errorMessage, safeParseTokenAmount, type TradeTabProps } from "@/components/trade/tradeTypes";
import { useConfidentialHoldings } from "@/hooks/useConfidentialHoldings";

const identityRegistryAddress = "0xb2afb921aa8ce9f53f678782840216661f0d849d" as const;
const quickSwitchSymbols = ["cBTC", "cETH", "cSOL", "cUSDC", "cUSDT"];

export function WrapTab({ selectedAsset, setSelectedSymbol }: TradeTabProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [activeStep, setActiveStep] = useState<"idle" | "approve" | "wrap" | "confirmed" | "error">("idle");
  const amountWei = useMemo(() => safeParseTokenAmount(amount), [amount]);
  const { refetch: refetchHoldings } = useConfidentialHoldings(address, selectedAsset.symbol);

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
  const kycStatus = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "isVerified",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && selectedAsset.requiresKYC) },
  });
  const isKycVerified = !selectedAsset.requiresKYC || Boolean(kycStatus.data);

  const steps: TradeStep[] = [
    { label: `Approve ${selectedAsset.symbol}`, status: stepStatus(activeStep, "approve") },
    { label: `Wrap to ${selectedAsset.symbol}`, status: stepStatus(activeStep, "wrap") },
    { label: "Confirmed 🔒", status: activeStep === "confirmed" ? "success" : activeStep === "error" ? "error" : "idle" },
  ];

  useEffect(() => {
    if (activeStep === "confirmed") {
      void refetchHoldings();
    }
  }, [activeStep, refetchHoldings]);

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

  if (activeStep === "confirmed") {
    return (
      <div className="trade-form-card">
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h3 className="text-green-400 font-bold text-lg mb-1">Wrapped Successfully!</h3>
          <p className="text-gray-300 text-sm mb-3">Your {selectedAsset.symbol} balance is now encrypted on-chain</p>
          {hash ? (
            <a className="text-purple-400 underline text-sm block mb-4" href={`https://sepolia.arbiscan.io/tx/${hash}`} rel="noreferrer" target="_blank">
              View on Arbiscan ↗
            </a>
          ) : null}
          <div className="flex gap-3 justify-center">
            <button
              className="secondary"
              onClick={() => {
                document.getElementById("portfolio")?.scrollIntoView({ behavior: "smooth" });
              }}
              type="button"
            >
              View in Portfolio →
            </button>
            <button
              onClick={() => {
                setActiveStep("idle");
                setAmount("");
                setError(null);
                setHash(undefined);
              }}
              type="button"
            >
              Wrap More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trade-form-card">
      <TradeAssetSelect label="Asset" selectedSymbol={selectedAsset.symbol} onChange={setSelectedSymbol} />
      <AssetPriceLine asset={selectedAsset} />
      <KycInlineStatus asset={selectedAsset} />
      <BalanceLine asset={selectedAsset} />
      {selectedAsset.requiresKYC && !isKycVerified ? (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm font-medium">⚠️ {selectedAsset.symbol} requires KYC</p>
          <p className="text-gray-400 text-xs mt-1 mb-2">Switch to a crypto or stablecoin to wrap without KYC</p>
          <div className="flex gap-2 flex-wrap">
            {quickSwitchSymbols.map((symbol) => (
              <button
                className="text-xs px-2 py-1 bg-purple-900/40 rounded text-purple-400 border border-purple-700/50"
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                type="button"
              >
                Switch to {symbol}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {address && balance.data === 0n ? (
        <div className="text-center text-sm py-2">
          <span className="text-gray-500">No {selectedAsset.symbol} balance.</span>
          <a className="text-purple-400 underline ml-1" href="https://cdefi.iex.ec/" rel="noreferrer" target="_blank">
            Get test tokens →
          </a>
        </div>
      ) : null}
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
      {activeStep !== "idle" ? <TransactionSteps steps={steps} /> : null}
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
