import { NextResponse } from "next/server";
import { createGeneralChatClient, extractBotText } from "@/lib/chaingpt";
import { categoryLabels, deployedAssetBySymbol, deployedAssets } from "@/lib/deployed-assets";

export const runtime = "nodejs";

type Message = {
  content: string;
  role: "assistant" | "user";
};

type ChatRequest = {
  asset?: string;
  history?: Message[];
  message?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const asset = deployedAssetBySymbol(body.asset ?? "") ?? deployedAssetBySymbol("cAAPL") ?? deployedAssets[0];
  const systemPrompt = buildSystemPrompt(asset);
  const history = (body.history ?? []).slice(-8).map((item) => `${item.role}: ${item.content}`).join("\n");

  try {
    const chat = createGeneralChatClient();
    const response = await chat.createChatBlob({
      question: `${systemPrompt}\n\nRecent conversation:\n${history || "None"}\n\nUser question: ${message}`,
      chatHistory: "off",
      useCustomContext: true,
      contextInjection: {
        companyName: "Private Onchain Stocks",
        companyDescription: "Confidential multi-asset DeFi protocol using iExec Nox Protocol and Confidential Tokens.",
        customTone: "Concise, factual, demo-friendly, and clear about testnet limitations.",
        purpose: "Explain the selected asset, wrapping, private transfers, ERC-3643 compliance, ERC-7984 confidential tokens, and Nox TEE workflows.",
        cryptoToken: true,
        tokenInformation: {
          tokenName: asset.name,
          tokenSymbol: asset.symbol,
          tokenAddress: asset.wrapperAddress,
          exploreUrl: "https://sepolia.arbiscan.io",
        },
      },
    });

    const answer = extractBotText(response);
    if (isUnhelpfulAnswer(answer, asset)) {
      return NextResponse.json({ answer: fallbackAnswer(message, asset), provider: "local-fallback" });
    }
    return NextResponse.json({ answer, provider: "chaingpt" });
  } catch {
    return NextResponse.json({ answer: fallbackAnswer(message, asset), provider: "local-fallback" });
  }
}

function buildSystemPrompt(asset: NonNullable<ReturnType<typeof deployedAssetBySymbol>>) {
  return `You are an AI assistant for Private Onchain Stocks, a confidential DeFi protocol with 61 assets on Arbitrum.

Current asset context: ${asset.name} (${asset.symbol}) — ${categoryLabels[asset.category]}
Base: ${asset.baseAddress}
Wrapper: ${asset.wrapperAddress}
KYC Required: ${asset.requiresKYC}

Protocol uses iExec Nox Protocol for confidential computing with TEE technology.
ERC-3643 for compliance, ERC-7984 for confidential token extensions.

Answer questions about this asset and the broader protocol concisely and accurately. If asked about prices, note these are testnet assets.`;
}

function fallbackAnswer(question: string, asset: NonNullable<ReturnType<typeof deployedAssetBySymbol>>) {
  const lower = question.toLowerCase();
  const kyc = asset.requiresKYC ? "This asset requires KYC before stock or commodity-style flows are available." : "This asset does not require KYC in the demo flow.";

  if (lower.includes("wrap")) {
    return `${asset.symbol} can be wrapped by approving the base token contract, then calling wrap() on the confidential wrapper at ${asset.wrapperAddress}. After wrapping, the balance is represented as an encrypted on-chain handle. ${kyc}`;
  }
  if (lower.includes("nox") || lower.includes("tee")) {
    return `iExec Nox provides the confidential-computing layer. Sensitive values such as transfer amounts and balance thresholds are handled through encrypted data and TEE-backed checks, while public contracts only expose handles and verification outcomes.`;
  }
  if (lower.includes("kyc")) {
    return `${asset.symbol} is ${asset.requiresKYC ? "KYC-gated" : "open-access"} in this protocol. ERC-3643-style identity checks protect restricted assets, while crypto and stablecoin wrappers remain open for demo usage.`;
  }
  if (lower.includes("collateral")) {
    return `${asset.symbol} is designed to be usable as confidential collateral: the protocol can verify sufficient balance without publishing the exact position size on-chain.`;
  }

  return `${asset.name} (${asset.symbol}) is one of the 61 Private Onchain Stocks assets on Arbitrum Sepolia. It has a base ERC-3643-style token at ${asset.baseAddress} and a confidential ERC-7984-style wrapper at ${asset.wrapperAddress}. ${kyc} Testnet prices and balances are for demonstration.`;
}

function isUnhelpfulAnswer(answer: string, asset: NonNullable<ReturnType<typeof deployedAssetBySymbol>>) {
  const lower = answer.toLowerCase();
  return (
    answer.trim().length < 40 ||
    lower.includes("isn't available") ||
    lower.includes("is not available") ||
    lower.includes("don't have information") ||
    lower.includes("do not have information") ||
    (!lower.includes(asset.symbol.toLowerCase()) && !lower.includes(asset.name.toLowerCase()))
  );
}
