"use client";

import { useEffect, useState } from "react";
import { AssetCategory } from "@/deploy/assets.config";
import { categoryLabels, type DeployedAsset } from "@/lib/deployed-assets";
import { shortAddress } from "@/lib/contracts";

type Message = {
  content: string;
  role: "assistant" | "user";
};

export function LLMAssistant({ asset }: { asset: DeployedAsset }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(asset));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages(initialMessages(asset));
    setInput("");
    setError(null);
  }, [asset.symbol]);

  async function sendMessage(forced?: string) {
    const message = (forced ?? input).trim();
    if (!message || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: asset.symbol, history: nextMessages, message }),
      });
      const payload = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !payload.answer) throw new Error(payload.error ?? "Assistant request failed");
      const answer = payload.answer;
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assistant request failed");
    } finally {
      setLoading(false);
    }
  }

  const questions = suggestedQuestions(asset);

  return (
    <article className="ai-tool-panel assistant-panel">
      <div className="ai-panel-header">
        <strong>{asset.symbol} AI Assistant 🤖</strong>
        <span>Powered by ChainGPT Web3 LLM</span>
      </div>
      <div className="system-context">
        Viewing {asset.name} ({asset.symbol}), a {categoryLabels[asset.category]} asset on Arbitrum Sepolia. Base:
        {shortAddress(asset.baseAddress)}. Wrapper: {shortAddress(asset.wrapperAddress)}. KYC Required:
        {asset.requiresKYC ? " Yes" : " No"}.
      </div>
      <div className="chat-window">
        {messages.map((message, index) => (
          <div className={`chat-bubble ${message.role === "assistant" ? "ai" : "user"}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
        {loading ? <div className="typing-dots"><span /><span /><span /></div> : null}
      </div>
      {error ? <div className="action-feedback error"><strong>{error}</strong></div> : null}
      <div className="suggested-questions">
        {questions.map((question) => (
          <button className="secondary" disabled={loading} key={question} onClick={() => void sendMessage(question)} type="button">
            {question}
          </button>
        ))}
      </div>
      <div className="chat-input-row">
        <input onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") void sendMessage();
        }} placeholder={`Ask about ${asset.symbol}`} value={input} />
        <button disabled={loading || !input.trim()} onClick={() => void sendMessage()} type="button">Send</button>
        <button className="ghost-button" onClick={() => setMessages(initialMessages(asset))} type="button">Clear</button>
      </div>
      <span className="chaingpt-badge">Powered by ChainGPT</span>
    </article>
  );
}

function initialMessages(asset: DeployedAsset): Message[] {
  return [
    {
      role: "assistant",
      content: `Ask me about ${asset.name} (${asset.symbol}), wrapping, private transfers, Nox, ERC-3643 compliance, ERC-7984 confidential tokens, dividends, or collateral.`,
    },
  ];
}

function suggestedQuestions(asset: DeployedAsset) {
  if (asset.category === AssetCategory.STOCK_US || asset.category === AssetCategory.STOCK_INTL) {
    return [
      `What is ${asset.symbol} and why is KYC required?`,
      `How do I wrap ${asset.symbol} tokens?`,
      `What dividends does ${asset.symbol} offer?`,
      `Which countries are blocked from holding ${asset.symbol}?`,
    ];
  }
  if (asset.category === AssetCategory.CRYPTO) {
    return [
      `What is confidential ${asset.symbol}?`,
      `How does ${asset.symbol} differ from regular ${asset.symbol.replace(/^c/, "")}?`,
      `Do I need KYC for ${asset.symbol}?`,
      `Can I use ${asset.symbol} as collateral?`,
    ];
  }
  if (asset.category === AssetCategory.COMMODITY) {
    return [
      `What backs the value of ${asset.symbol}?`,
      `How is ${asset.symbol} price determined?`,
      `What settlement currency does ${asset.symbol} use?`,
    ];
  }
  return [
    `How does ${asset.symbol} maintain its peg?`,
    `Can I use ${asset.symbol} to buy other assets?`,
    `What yield does ${asset.symbol} offer?`,
  ];
}
