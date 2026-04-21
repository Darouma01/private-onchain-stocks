"use client";

import { formatEther, type Address } from "viem";
import { useAccount } from "wagmi";
import { EmptyState, KYCBadge } from "@/components/SharedUi";
import { useRevealBalance } from "@/hooks/useRevealBalance";
import { truncateHandle, type ConfidentialHolding } from "@/hooks/useConfidentialHoldings";

export function HoldingsTable({
  holdings,
  onTransfer,
  onUnwrap,
  onValueReveal,
  revealedBalances,
}: {
  holdings: ConfidentialHolding[];
  onTransfer: (asset: ConfidentialHolding["asset"]) => void;
  onUnwrap: (asset: ConfidentialHolding["asset"]) => void;
  onValueReveal: (symbol: string, amount: bigint | null) => void;
  revealedBalances: Record<string, bigint>;
}) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <EmptyState
        action="Connect Wallet"
        href="#wallet"
        text="Connect your wallet to view your confidential portfolio."
        title="Wallet connection required"
      />
    );
  }

  if (holdings.length === 0) {
    return <EmptyState action="Go to Trade →" href="#trade" text="Wrap any asset to get started." title="No confidential holdings yet." />;
  }

  return (
    <div className="holdings-table-shell">
      <table className="holdings-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Name</th>
            <th>Encrypted Balance</th>
            <th>Est. Value</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => (
            <HoldingRow
              holding={holding}
              key={holding.asset.symbol}
              onTransfer={onTransfer}
              onUnwrap={onUnwrap}
              onValueReveal={onValueReveal}
              revealedBalance={revealedBalances[holding.asset.symbol]}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HoldingRow({
  holding,
  onTransfer,
  onUnwrap,
  onValueReveal,
  revealedBalance,
}: {
  holding: ConfidentialHolding;
  onTransfer: (asset: ConfidentialHolding["asset"]) => void;
  onUnwrap: (asset: ConfidentialHolding["asset"]) => void;
  onValueReveal: (symbol: string, amount: bigint | null) => void;
  revealedBalance?: bigint;
}) {
  const { address } = useAccount();
  const reveal = useRevealBalance({
    assetSymbol: holding.asset.symbol,
    owner: address as Address | undefined,
    wrapperAddress: holding.asset.wrapperAddress,
  });

  async function handleReveal() {
    const amount = await reveal.revealBalance();
    onValueReveal(holding.asset.symbol, amount);
  }

  function hide() {
    reveal.resetReveal();
    onValueReveal(holding.asset.symbol, null);
  }

  const activeRevealed = revealedBalance ?? reveal.revealedBalance ?? null;
  const value = activeRevealed !== null && holding.price ? Number(formatEther(activeRevealed)) * holding.price : null;

  return (
    <tr>
      <td>
        <div className="asset-cell">
          <span className="asset-token-icon">{holding.asset.symbol.replace(/^c/, "").slice(0, 2)}</span>
          <strong>{holding.asset.symbol}</strong>
        </div>
      </td>
      <td className="name-cell">
        <div className="stack tight">
          <span>{holding.asset.name}</span>
          <div className="row">
            <span className="category-chip">{holding.asset.category.replace("STOCK_", "STOCK ")}</span>
            <KYCBadge status={holding.asset.requiresKYC ? "Required" : "Open"} />
          </div>
        </div>
      </td>
      <td>
        <div className="hidden-value-cell">
          <span>{activeRevealed !== null ? `🔓 ${formatEther(activeRevealed)} ${holding.asset.symbol}` : `🔒 ${truncateHandle(holding.handle)}`}</span>
          <button className="ghost-button" disabled={reveal.isPending} onClick={() => void (activeRevealed !== null ? hide() : handleReveal())} type="button">
            {activeRevealed !== null ? "Hide" : reveal.isPending ? "Revealing..." : "Reveal"}
          </button>
        </div>
        {reveal.txUrl ? (
          <a href={reveal.txUrl} rel="noreferrer" target="_blank">
            Reveal tx
          </a>
        ) : null}
      </td>
      <td className="price-cell">{value === null ? "🔒 Hidden" : formatUsd(value)}</td>
      <td>
        <div className="table-actions">
          <button onClick={() => onTransfer(holding.asset)} type="button">
            Transfer
          </button>
          <button className="secondary" onClick={() => onUnwrap(holding.asset)} type="button">
            Unwrap
          </button>
        </div>
      </td>
    </tr>
  );
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: 2,
  }).format(value);
}
