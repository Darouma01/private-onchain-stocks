"use client";

import { encodeFunctionData, formatEther } from "viem";
import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { confidentialWrapperAbi } from "@/lib/contracts";
import { getCachedAssetPrice } from "@/lib/prices/usePrices";
import { type ConfidentialHolding, useConfidentialHoldings } from "@/hooks/useConfidentialHoldings";
import { PortfolioHero } from "@/components/portfolio/PortfolioHero";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { TransferModal } from "@/components/portfolio/TransferModal";
import { UnwrapModal } from "@/components/portfolio/UnwrapModal";
import { ActivityFeed } from "@/components/portfolio/ActivityFeed";
import { TierCard } from "@/components/portfolio/TierCard";

export function PortfolioSection() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const walletClient = useWalletClient();
  const { holdings, isLoading, refetch } = useConfidentialHoldings();
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const [revealedBalances, setRevealedBalances] = useState<Record<string, bigint>>({});
  const [revealingAll, setRevealingAll] = useState(false);
  const [revealProgress, setRevealProgress] = useState<string | null>(null);
  const [transferHolding, setTransferHolding] = useState<ConfidentialHolding | null>(null);
  const [unwrapHolding, setUnwrapHolding] = useState<ConfidentialHolding | null>(null);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, [holdings.length]);

  const portfolioValue = useMemo(() => {
    const values = holdings.flatMap((holding) => {
      const revealed = revealedBalances[holding.asset.symbol];
      const quote = getCachedAssetPrice(holding.asset.symbol);
      if (revealed === undefined || !quote) return [];
      return [Number(formatEther(revealed)) * quote.price];
    });
    if (values.length !== holdings.length || values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0);
  }, [holdings, revealedBalances]);

  async function revealAll() {
    if (!walletClient.data || !publicClient || holdings.length === 0) return;
    setRevealingAll(true);
    const nextBalances: Record<string, bigint> = {};

    try {
      for (const [index, holding] of holdings.entries()) {
        const owner = walletClient.data.account.address;
        setRevealProgress(`Revealing ${index + 1} of ${holdings.length} assets...`);
        const data = encodeFunctionData({
          abi: confidentialWrapperAbi,
          functionName: "decryptBalance",
          args: [owner, "0x"],
        });
        const hash = await walletClient.data.sendTransaction({
          account: owner,
          data,
          to: holding.asset.wrapperAddress,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        const amount = await publicClient.readContract({
          account: owner,
          address: holding.asset.wrapperAddress,
          abi: confidentialWrapperAbi,
          functionName: "decryptBalance",
          args: [owner, "0x"],
        });
        nextBalances[holding.asset.symbol] = amount;
      }
      setRevealedBalances(nextBalances);
    } finally {
      setRevealingAll(false);
      setRevealProgress(null);
    }
  }

  function hideBalance(symbol: string) {
    setRevealedBalances((current) => {
      const next = { ...current };
      delete next[symbol];
      return next;
    });
  }

  const tierLabel = tierLabelFor(holdings.length);

  return (
    <div className="portfolio-dashboard">
      {!isConnected ? (
        <section className="portfolio-state-card">
          <span className="muted">💼 Your Portfolio</span>
          <strong>Connect your wallet to view your confidential holdings</strong>
          <a className="button-link" href="#wallet">Connect Wallet</a>
        </section>
      ) : null}

      {isConnected && isLoading ? (
        <section className="portfolio-state-card">
          <span className="muted">💼 Your Portfolio</span>
          <strong>{address ? `${address.slice(0, 6)}...${address.slice(-4)} connected` : "Wallet connected"}</strong>
          <p>Loading confidential wrapper balances…</p>
        </section>
      ) : null}

      {isConnected && !isLoading && holdings.length === 0 ? (
        <section className="portfolio-state-card">
          <span className="muted">💼 Your Portfolio</span>
          <strong>{address ? `${address.slice(0, 6)}...${address.slice(-4)} connected` : "Wallet connected"}</strong>
          <p>No confidential holdings yet.</p>
          <p>Wrap any asset from Markets to start your private portfolio.</p>
          <a className="button-link" href="#markets">Browse Markets →</a>
        </section>
      ) : null}

      {isConnected && holdings.length > 0 ? (
        <>
          <PortfolioHero
            canRevealAll={holdings.length > 0}
            isHidden={portfolioValue === null}
            isRevealingAll={revealingAll}
            lastUpdatedLabel={lastUpdated}
            progressLabel={revealProgress}
            onHideAll={() => setRevealedBalances({})}
            onRevealAll={() => void revealAll()}
            totalHoldings={holdings.length}
            totalTier={tierLabel}
            totalValue={portfolioValue}
          />

          <section className="portfolio-panel">
            <div className="row">
              <div>
                <strong>Confidential Holdings</strong>
                <p className="muted">Shows only assets this wallet currently holds in confidential wrappers.</p>
              </div>
              <span className="status-dot neutral">{holdings.length} positions</span>
            </div>
            <HoldingsTable
              holdings={holdings}
              onBalanceReveal={(symbol, amount) => setRevealedBalances((current) => ({ ...current, [symbol]: amount }))}
              onHideBalance={hideBalance}
              onTransfer={(holding) => setTransferHolding(holding)}
              onUnwrap={(holding) => setUnwrapHolding(holding)}
              revealedBalances={revealedBalances}
            />
          </section>

          <section className="portfolio-lower-grid">
            <TierCard confidentialAssetCount={holdings.length} />
            <ActivityFeed />
          </section>
        </>
      ) : null}

      {transferHolding ? (
        <TransferModal
          holding={transferHolding}
          onClose={() => setTransferHolding(null)}
          onComplete={() => {
            void refetch();
            setTransferHolding(null);
          }}
          revealedBalance={revealedBalances[transferHolding.asset.symbol]}
        />
      ) : null}

      {unwrapHolding ? (
        <UnwrapModal
          holding={unwrapHolding}
          onClose={() => setUnwrapHolding(null)}
          onComplete={() => {
            void refetch();
            setUnwrapHolding(null);
          }}
          revealedBalance={revealedBalances[unwrapHolding.asset.symbol]}
        />
      ) : null}
    </div>
  );
}

function tierLabelFor(count: number) {
  if (count >= 20) return "Elite 🏛️";
  if (count >= 10) return "Tier 3 🥇 Institutional";
  if (count >= 5) return "Tier 2 🥈 Premium";
  return "Tier 1 🥉 Basic";
}
