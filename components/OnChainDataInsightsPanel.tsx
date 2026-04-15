"use client";

import { useEffect, useState } from "react";
import type { InsightsResponse } from "@/types/ai";

export function OnChainDataInsightsPanel() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadInsights() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chaingpt/insights", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load insights");
      }
      setData(payload as InsightsResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load insights");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInsights();
  }, []);

  return (
    <section className="section">
      <div className="row">
        <div>
          <h2>On-Chain Data Insights</h2>
          <p className="muted">Holder-only aggregate metrics for private payments, collateral activity, and reward readiness.</p>
        </div>
        <button disabled={loading} onClick={loadInsights}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {loading && !data ? <p className="muted">Loading live chain data and ChainGPT insights...</p> : null}

      {data ? (
        <div className="stack">
          <div className="metric-grid">
            <Metric label="Token" value={data.tokenSymbol} />
            <Metric label="Total Supply" value={data.totalSupply} />
            <Metric label="Holders" value={data.holderCount} />
            <Metric label="Confidential Transfers" value={String(data.confidentialTransferCount)} />
          </div>

          <div className="stack">
            <strong>Recent Activity</strong>
            {data.recentActivity.length ? (
              <ul className="activity">
                {data.recentActivity.map((activity) => (
                  <li key={`${activity.transactionHash}-${activity.amountHandle}`}>
                    <span>
                      {activity.from} to {activity.to}
                    </span>
                    <span className="muted">Encrypted amount: {shortenHandle(activity.amountHandle)}</span>
                    <span className="muted">Block {activity.blockNumber}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No confidential transfer events found in the latest scan window.</p>
            )}
          </div>

          <div className="result">{data.aiSummary}</div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function shortenHandle(handle: string) {
  if (handle.length <= 18) return handle;
  return `${handle.slice(0, 10)}...${handle.slice(-8)}`;
}
