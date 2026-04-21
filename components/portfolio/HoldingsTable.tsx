"use client";

import { formatEther, type Address } from "viem";
import { useAccount } from "wagmi";
import { getCachedAssetPrice } from "@/lib/prices/usePrices";
import { useRevealBalance } from "@/hooks/useRevealBalance";
import { truncateHandle, type ConfidentialHolding } from "@/hooks/useConfidentialHoldings";

export function HoldingsTable({
  holdings,
  onBalanceReveal,
  onHideBalance,
  onTransfer,
  onUnwrap,
  revealedBalances,
}: {
  holdings: ConfidentialHolding[];
  onBalanceReveal: (symbol: string, amount: bigint) => void;
  onHideBalance: (symbol: string) => void;
  onTransfer: (holding: ConfidentialHolding) => void;
  onUnwrap: (holding: ConfidentialHolding) => void;
  revealedBalances: Record<string, bigint>;
}) {
  return (
    <div className="holdings-table-shell">
      <table className="holdings-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Balance</th>
            <th>Value</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => (
            <HoldingRow
              holding={holding}
              key={holding.asset.symbol}
              onBalanceReveal={onBalanceReveal}
              onHideBalance={onHideBalance}
              onTransfer={onTransfer}
              onUnwrap={onUnwrap}
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
  onBalanceReveal,
  onHideBalance,
  onTransfer,
  onUnwrap,
  revealedBalance,
}: {
  holding: ConfidentialHolding;
  onBalanceReveal: (symbol: string, amount: bigint) => void;
  onHideBalance: (symbol: string) => void;
  onTransfer: (holding: ConfidentialHolding) => void;
  onUnwrap: (holding: ConfidentialHolding) => void;
  revealedBalance?: bigint;
}) {
  const { address } = useAccount();
  const reveal = useRevealBalance({
    assetSymbol: holding.asset.symbol,
    owner: address as Address | undefined,
    wrapperAddress: holding.asset.wrapperAddress,
  });
  const quote = getCachedAssetPrice(holding.asset.symbol);
  const value = revealedBalance !== undefined && quote ? Number(formatEther(revealedBalance)) * quote.price : null;

  async function handleReveal() {
    const amount = await reveal.revealBalance();
    if (amount !== null) onBalanceReveal(holding.asset.symbol, amount);
  }

  return (
    <tr>
      <td>
        <div className="asset-cell">
          <span className="asset-token-icon">{assetGlyph(holding.asset.symbol)}</span>
          <div>
            <strong>{holding.asset.symbol}</strong>
            <small>{holding.asset.name}</small>
          </div>
        </div>
      </td>
      <td>
        <div className="stack tight">
          <span>{revealedBalance !== undefined ? `🔓 ${formatEther(revealedBalance)} ${holding.asset.symbol}` : `🔒 ${truncateHandle(holding.handle)}`}</span>
          <button
            className="ghost-button"
            disabled={reveal.isPending}
            onClick={() => void (revealedBalance !== undefined ? onHideBalance(holding.asset.symbol) : handleReveal())}
            type="button"
          >
            {revealedBalance !== undefined ? "Hide Balance" : reveal.isPending ? "⏳ Decrypting..." : "Reveal Balance"}
          </button>
          {reveal.txUrl ? (
            <a href={reveal.txUrl} rel="noreferrer" target="_blank">
              View on Arbiscan ↗
            </a>
          ) : null}
        </div>
      </td>
      <td>{value === null ? "🔒 Hidden" : formatUsd(value)}</td>
      <td>
        <div className="table-actions">
          <button onClick={() => onTransfer(holding)} type="button">
            Transfer
          </button>
          <button className="secondary" onClick={() => onUnwrap(holding)} type="button">
            Unwrap
          </button>
        </div>
      </td>
    </tr>
  );
}

function assetGlyph(symbol: string) {
  if (symbol === "cBTC") return "₿";
  if (symbol === "cGOLD") return "🏅";
  if (symbol.startsWith("c") && ["cAAPL", "cTSLA", "cMSFT", "cGOOGL", "cAMZN", "cNVDA", "cMETA", "cBRK", "cJPM", "cV", "cJNJ", "cWMT", "cXOM", "cBAC", "cNFLX", "cDIS", "cPFE", "cKO", "cMCD", "cGS"].includes(symbol)) {
    return "🇺🇸";
  }
  return symbol.replace(/^c/, "").slice(0, 2).toUpperCase();
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: 2,
  }).format(value);
}
