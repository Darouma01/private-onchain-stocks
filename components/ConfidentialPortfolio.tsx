"use client";

import { FormEvent, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  baseAssetAbi,
  confidentialWrapperAbi,
  shortAddress,
  txUrl,
} from "@/lib/contracts";
import { AssetCategory } from "@/deploy/assets.config";
import { useSelectedAsset } from "@/hooks/useSelectedAsset";
import { AssetContextPill } from "@/components/AssetContextPill";

type ActionState = {
  label: string;
  hash?: `0x${string}`;
  error?: string;
};

export function ConfidentialPortfolio() {
  const { address, isConnected } = useAccount();
  const { selectedAsset, setSelectedAsset } = useSelectedAsset();
  const [wrapAmount, setWrapAmount] = useState("10");
  const [transferAmount, setTransferAmount] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [revealRequested, setRevealRequested] = useState(false);
  const [action, setAction] = useState<ActionState | null>(null);
  const { writeContractAsync } = useWriteContract();

  const { data: standardBalance, refetch: refetchStandard } = useReadContract({
    address: selectedAsset.baseAddress,
    abi: baseAssetAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedAsset.baseAddress,
    abi: baseAssetAbi,
    functionName: "allowance",
    args: address ? [address, selectedAsset.wrapperAddress] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: encryptedBalance, refetch: refetchEncrypted } = useReadContract({
    address: selectedAsset.wrapperAddress,
    abi: confidentialWrapperAbi,
    functionName: "getEncryptedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: revealedBalance, isLoading: revealLoading, error: revealError, refetch: revealBalance } = useReadContract({
    address: selectedAsset.wrapperAddress,
    abi: confidentialWrapperAbi,
    functionName: "decryptBalance",
    args: address ? [address, "0x"] : undefined,
    account: address,
    query: { enabled: false },
  });

  const wait = useWaitForTransactionReceipt({
    hash: action?.hash,
    query: { enabled: Boolean(action?.hash) },
  });

  const standardBalanceLabel = standardBalance === undefined ? "..." : `${formatEther(standardBalance)} ${selectedAsset.symbol}`;
  const hasEncryptedBalance = encryptedBalance && encryptedBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000";
  const wrapAmountWei = useMemo(() => safeParseEther(wrapAmount), [wrapAmount]);

  async function refreshBalances() {
    await Promise.all([refetchStandard(), refetchAllowance(), refetchEncrypted()]);
  }

  async function approveIfNeeded(amount: bigint) {
    if ((allowance ?? 0n) >= amount) return;
    setAction({ label: `Approving ${selectedAsset.symbol} for confidential wrapping...` });
    const hash = await writeContractAsync({
      address: selectedAsset.baseAddress,
      abi: baseAssetAbi,
      functionName: "approve",
      args: [selectedAsset.wrapperAddress, amount],
    });
    setAction({ label: "Approval submitted", hash });
  }

  async function wrap(event: FormEvent) {
    event.preventDefault();
    if (!wrapAmountWei) {
      setAction({ label: "Enter a valid wrap amount", error: "Amount must be greater than zero." });
      return;
    }

    try {
      await approveIfNeeded(wrapAmountWei);
      setAction({ label: `Wrapping ${selectedAsset.symbol} into confidential ${selectedAsset.symbol}...` });
      const hash = await writeContractAsync({
        address: selectedAsset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "wrap",
        args: [wrapAmountWei, "0x"],
      });
      setAction({ label: "Wrap transaction submitted", hash });
      await refreshBalances();
    } catch (caught) {
      setAction({ label: "Wrap failed", error: caught instanceof Error ? caught.message : "Wrap failed" });
    }
  }

  async function confidentialTransfer(event: FormEvent) {
    event.preventDefault();
    const amountWei = safeParseEther(transferAmount);
    if (!amountWei || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setAction({ label: "Transfer needs attention", error: "Enter a valid recipient and amount." });
      return;
    }

    try {
      setAction({ label: "Creating encrypted transfer handle..." });
      const handleResponse = await fetch("/api/demo/create-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountWei.toString() }),
      });
      const handlePayload = (await handleResponse.json()) as { handle?: `0x${string}`; transactionHash?: `0x${string}`; error?: string };
      if (!handleResponse.ok || !handlePayload.handle) {
        throw new Error(handlePayload.error ?? "Unable to create encrypted amount handle");
      }
      setAction({ label: "Encrypted amount handle created", hash: handlePayload.transactionHash });

      setAction({ label: "Submitting confidential transfer..." });
      const hash = await writeContractAsync({
        address: selectedAsset.wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "confidentialTransfer",
        args: [recipient as `0x${string}`, handlePayload.handle, "0x"],
      });
      setAction({ label: "Confidential transfer submitted", hash });
      await refreshBalances();
    } catch (caught) {
      setAction({
        label: "Confidential transfer failed",
        error: caught instanceof Error ? caught.message : "Confidential transfer failed",
      });
    }
  }

  async function reveal() {
    setRevealRequested(true);
    setAction({ label: "Requesting Nox balance disclosure..." });
    const result = await revealBalance();
    if (result.error) {
      setAction({ label: "Reveal failed", error: result.error.message });
    } else {
      setAction({ label: "Confidential balance revealed to your wallet session." });
    }
  }

  return (
    <section className="section portfolio-section">
      <AssetContextPill selectedAsset={selectedAsset} onChange={setSelectedAsset} />
      <div className="row">
        <div>
          <h2>Your {selectedAsset.symbol}</h2>
          <p className="muted">{portfolioDescription(selectedAsset.symbol, selectedAsset.category)}</p>
        </div>
        {isConnected ? <span className="status-dot good">{shortAddress(address)}</span> : null}
      </div>

      {!isConnected ? (
        <EmptyState title="Connect to start" text={`No assets yet. Connect your wallet to view ${selectedAsset.symbol} and wrap your first token.`} />
      ) : (
        <div className="stack">
          <div className="metric-grid">
            <div className="metric">
              <span className="muted">Standard {selectedAsset.symbol}</span>
              <strong>{standardBalanceLabel}</strong>
            </div>
            <div className="metric">
              <span className="muted">Encrypted {selectedAsset.symbol} balance handle</span>
              <strong className="handle-text">{hasEncryptedBalance ? `${encryptedBalance.slice(0, 10)}...` : "None yet"}</strong>
            </div>
          </div>

          {!hasEncryptedBalance ? (
            <EmptyState title="No confidential assets yet" text={`Wrap your first ${selectedAsset.symbol} token to create a private balance.`} />
          ) : null}

          <form className="action-panel" onSubmit={wrap}>
            <div>
              <strong>Wrap {selectedAsset.symbol}</strong>
              <p className="muted">Deposits standard {selectedAsset.symbol} and unlocks confidential token utilities in the dashboard.</p>
            </div>
            <input value={wrapAmount} onChange={(event) => setWrapAmount(event.target.value)} inputMode="decimal" />
            <button disabled={!wrapAmountWei}>Wrap</button>
          </form>

          <div className="action-panel">
            <div>
              <strong>Reveal confidential balance</strong>
              <p className="muted">Only your wallet can request this Nox-backed disclosure for VIP and collateral checks.</p>
            </div>
            <button disabled={!hasEncryptedBalance || revealLoading} onClick={() => void reveal()}>
              {revealLoading ? "Revealing..." : "Reveal My Balance"}
            </button>
            {revealRequested && revealedBalance !== undefined ? (
              <p className="success">Revealed balance: {formatEther(revealedBalance)} confidential {selectedAsset.symbol}</p>
            ) : null}
            {revealError ? <p className="error">{revealError.message}</p> : null}
          </div>

          <form className="action-panel" onSubmit={confidentialTransfer}>
            <div>
              <strong>Confidential transfer</strong>
              <p className="muted">{transferDescription(selectedAsset.symbol, selectedAsset.category)}</p>
            </div>
            <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Recipient wallet" />
            <input value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} inputMode="decimal" />
            <button>Prepare Transfer</button>
          </form>

          <ActionFeedback action={action} pending={wait.isLoading} confirmed={wait.isSuccess} />
        </div>
      )}
    </section>
  );
}

function ActionFeedback({ action, pending, confirmed }: { action: ActionState | null; pending: boolean; confirmed: boolean }) {
  if (!action) return null;
  return (
    <div className={`feedback ${action.error ? "bad" : confirmed ? "good" : "neutral"}`}>
      <strong>{pending ? "Waiting for confirmation..." : action.label}</strong>
      {action.error ? <p>{action.error}</p> : null}
      {action.hash ? (
        <a href={txUrl(action.hash)} target="_blank" rel="noreferrer">
          View transaction on Arbiscan
        </a>
      ) : null}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function portfolioDescription(symbol: string, category: AssetCategory) {
  const rewardLabel =
    category === AssetCategory.STOCK_US || category === AssetCategory.STOCK_INTL
      ? "dividends"
      : category === AssetCategory.CRYPTO
        ? "staking rewards"
        : "yield";
  return `Wrap ${symbol} into confidential ${symbol} for private payments, holder access, collateral, ${rewardLabel}, and governance.`;
}

function transferDescription(symbol: string, category: AssetCategory) {
  if (category === AssetCategory.CRYPTO) {
    return `Transfer ${symbol} privately between wallets without exposing the amount.`;
  }
  if (category === AssetCategory.COMMODITY) {
    return `Settle a private ${symbol} commodity position without exposing the amount.`;
  }
  if (category === AssetCategory.STABLECOIN) {
    return `Send private ${symbol} payments without exposing payroll, OTC, or treasury transfer amounts.`;
  }
  return `Settle a private ${symbol} equity payment with a verified investor without exposing the amount.`;
}

function safeParseEther(value: string) {
  try {
    const parsed = parseEther(value);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}
