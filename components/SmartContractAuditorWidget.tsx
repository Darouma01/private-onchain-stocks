"use client";

import { useState } from "react";
import type { AuditResponse, AuditRiskLevel } from "@/types/ai";

const emptyAudit: AuditResponse = {
  report: "",
  riskLevel: "Unknown",
  vulnerabilities: [],
  recommendations: [],
};

export function SmartContractAuditorWidget() {
  const [inputType, setInputType] = useState<"address" | "code">("code");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AuditResponse>(emptyAudit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAudit() {
    setLoading(true);
    setError("");
    setResult(emptyAudit);

    try {
      const response = await fetch("/api/chaingpt/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, inputType, sdkUniqueId: getSessionId() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Audit failed");
      }
      setResult(payload as AuditResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="row">
        <div>
          <h2>Smart Contract Auditor</h2>
          <p className="muted">Paste verified Solidity code or a contract address before investing.</p>
        </div>
        {result.report ? <RiskPill level={result.riskLevel} /> : null}
      </div>

      <label className="stack">
        <span className="muted">Input type</span>
        <select value={inputType} onChange={(event) => setInputType(event.target.value as "address" | "code")}>
          <option value="code">Solidity code</option>
          <option value="address">Contract address</option>
        </select>
      </label>

      <label className="stack">
        <span className="muted">{inputType === "code" ? "Contract code" : "Contract address"}</span>
        {inputType === "code" ? (
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="pragma solidity ^0.8.20; contract CAAPLToken { ... }"
          />
        ) : (
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="0x..."
            spellCheck={false}
          />
        )}
      </label>

      <button disabled={loading || !input.trim()} onClick={runAudit}>
        {loading ? "Auditing..." : "Run ChainGPT Audit"}
      </button>

      {error ? <p className="error">{error}</p> : null}

      {result.report ? (
        <div className="stack">
          <SummaryList title="Vulnerabilities" items={result.vulnerabilities} empty="No specific findings extracted." />
          <SummaryList title="Recommendations" items={result.recommendations} empty="No recommendations extracted." />
          <div className="result">{result.report}</div>
        </div>
      ) : null}
    </section>
  );
}

function RiskPill({ level }: { level: AuditRiskLevel }) {
  return <span className={`pill ${level.toLowerCase()}`}>{level} risk</span>;
}

function SummaryList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="stack">
      <strong>{title}</strong>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </div>
  );
}

function getSessionId() {
  const key = "private-onchain-stocks-session";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}
