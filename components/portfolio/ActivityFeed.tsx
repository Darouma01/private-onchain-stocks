"use client";

import { useEffect, useState } from "react";
import { parseAbi } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { deployedAssets } from "@/lib/deployed-assets";
import { txUrl } from "@/lib/contracts";

type ActivityItem = {
  hash: `0x${string}`;
  label: string;
  time: string;
  tone: string;
};

const activityAbi = parseAbi([
  "event AssetWrapped(address indexed asset, address indexed user)",
  "event AssetUnwrapped(address indexed asset, address indexed user)",
  "event ConfidentialTransfer(address indexed asset, address indexed from, address indexed to)",
]);

export function ActivityFeed() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      if (!address || !publicClient) return;
      setLoading(true);

      try {
        const addresses = deployedAssets.map((asset) => asset.wrapperAddress);
        const latest = await publicClient.getBlockNumber();
        const fromBlock = latest > 20_000n ? latest - 20_000n : 0n;

        const [wrapped, unwrapped, sent, received] = await Promise.all([
          publicClient.getLogs({
            address: addresses,
            event: activityAbi[0],
            args: { user: address },
            fromBlock,
            toBlock: "latest",
          }),
          publicClient.getLogs({
            address: addresses,
            event: activityAbi[1],
            args: { user: address },
            fromBlock,
            toBlock: "latest",
          }),
          publicClient.getLogs({
            address: addresses,
            event: activityAbi[2],
            args: { from: address },
            fromBlock,
            toBlock: "latest",
          }),
          publicClient.getLogs({
            address: addresses,
            event: activityAbi[2],
            args: { to: address },
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        const all = [
          ...wrapped.map((log) => toActivity("wrap", log.blockNumber ?? 0n, log.transactionHash as `0x${string}`, symbolFor(log.args.asset))),
          ...unwrapped.map((log) => toActivity("unwrap", log.blockNumber ?? 0n, log.transactionHash as `0x${string}`, symbolFor(log.args.asset))),
          ...sent.map((log) => toActivity("sent", log.blockNumber ?? 0n, log.transactionHash as `0x${string}`, symbolFor(log.args.asset))),
          ...received.map((log) => toActivity("received", log.blockNumber ?? 0n, log.transactionHash as `0x${string}`, symbolFor(log.args.asset))),
        ].sort((left, right) => Number(right.blockNumber - left.blockNumber));

        const recent = await Promise.all(
          all.slice(0, 6).map(async (item) => {
            const block = await publicClient.getBlock({ blockNumber: item.blockNumber });
            return {
              ...item,
              time: formatTimestamp(Number(block.timestamp) * 1000),
            };
          }),
        );

        if (!cancelled) setItems(recent.map(({ blockNumber, ...item }) => item));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  return (
    <div className="activity-card">
      <div>
        <strong>Recent Activity</strong>
        <p className="muted">Amounts remain hidden unless individually revealed.</p>
      </div>
      <div className="activity-feed">
        {!isConnected ? <p className="muted">Connect wallet to view recent activity.</p> : null}
        {isConnected && loading ? <p className="muted">Loading on-chain activity…</p> : null}
        {isConnected && !loading && items.length === 0 ? <p className="muted">No recent confidential activity yet.</p> : null}
        {items.map((item) => (
          <div className="activity-item" key={`${item.hash}-${item.label}`}>
            <span className={item.tone} />
            <div>
              <strong>{item.label}</strong>
              <small>{item.time} · Amount 🔒</small>
            </div>
            <a href={txUrl(item.hash)} rel="noreferrer" target="_blank">
              Arbiscan
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function symbolFor(address?: string) {
  return deployedAssets.find((asset) => asset.wrapperAddress.toLowerCase() === address?.toLowerCase())?.symbol ?? "asset";
}

function toActivity(kind: "received" | "sent" | "unwrap" | "wrap", blockNumber: bigint, hash: `0x${string}`, symbol: string) {
  const label =
    kind === "wrap"
      ? `Wrapped ${symbol}`
      : kind === "unwrap"
        ? `Unwrapped ${symbol}`
        : kind === "sent"
          ? `Sent ${symbol} confidentially`
          : `Received ${symbol} confidentially`;

  return {
    blockNumber,
    hash,
    label,
    time: `Block ${blockNumber.toString()}`,
    tone: kind === "wrap" ? "activity-wrap" : kind === "unwrap" ? "activity-transfer" : "activity-transfer",
  };
}

function formatTimestamp(timestampMs: number) {
  const seconds = Math.max(0, Math.round((Date.now() - timestampMs) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}
