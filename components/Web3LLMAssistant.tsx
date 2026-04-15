"use client";

import { FormEvent, useState } from "react";
import type { ChatMessage } from "@/types/ai";

const starterQuestions = [
  "How do private ccAAPL payments work?",
  "What unlocks VIP investor access?",
  "How do confidential rewards work?",
];

export function Web3LLMAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask about cAAPL, confidential transfers, ERC-3643 compliance, ERC-7984 encrypted balances, or contract risk.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event?: FormEvent, forcedQuestion?: string) {
    event?.preventDefault();
    const prompt = (forcedQuestion ?? question).trim();
    if (!prompt) return;

    setLoading(true);
    setError("");
    setQuestion("");
    setMessages((current) => [...current, { role: "user", content: prompt }]);

    try {
      const response = await fetch("/api/chaingpt/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, sdkUniqueId: getSessionId() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Assistant request failed");
      }
      setMessages((current) => [...current, { role: "assistant", content: payload.answer }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assistant request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div>
        <h2>Web3 LLM Assistant</h2>
        <p className="muted">Holder-only ChainGPT guidance for private payments, collateral, rewards, and VIP access.</p>
      </div>

      <div className="row">
        {starterQuestions.map((starter) => (
          <button key={starter} disabled={loading} onClick={() => void ask(undefined, starter)}>
            {starter}
          </button>
        ))}
      </div>

      <div className="chat-log">
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
      </div>

      <form className="stack" onSubmit={(event) => void ask(event)}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about confidential stock transfers..."
        />
        <button disabled={loading || !question.trim()}>{loading ? "Thinking..." : "Ask ChainGPT"}</button>
      </form>

      {error ? <p className="error">{error}</p> : null}
    </section>
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
