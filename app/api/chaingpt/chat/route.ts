import { NextResponse } from "next/server";
import { createGeneralChatClient, extractBotText, normalizeChainGPTError } from "@/lib/chaingpt";
import { buildAssistantQuestion, projectContext } from "@/lib/project-context";

export const runtime = "nodejs";

type ChatRequest = {
  question: string;
  sdkUniqueId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ChatRequest>;
    const question = body.question?.trim();
    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const chat = createGeneralChatClient();
    const response = await chat.createChatBlob({
      question: buildAssistantQuestion(question),
      chatHistory: body.sdkUniqueId ? "on" : "off",
      useCustomContext: true,
      contextInjection: {
        companyName: projectContext.name,
        companyDescription: projectContext.description,
        purpose:
          "Help investors and developers understand cAAPL, ERC-3643 compliance, ERC-7984 confidential balances, iExec Nox TEE transfer checks, and smart-contract risk.",
        cryptoToken: true,
        tokenInformation: {
          tokenName: projectContext.tokenName,
          tokenSymbol: projectContext.tokenSymbol,
          tokenAddress: process.env.NEXT_PUBLIC_CAAPL_TOKEN_ADDRESS,
          tokenSourceCode: "contracts/src/CAAPL3643Suite.sol and contracts/src/ConfidentialCAAPLToken.sol",
          exploreUrl: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL,
        },
        limitation: true,
        customTone: "Concise, factual, security-aware, and clear about privacy limits.",
      },
      ...(body.sdkUniqueId ? { sdkUniqueId: body.sdkUniqueId } : {}),
    });

    return NextResponse.json({ answer: extractBotText(response) });
  } catch (error) {
    return NextResponse.json({ error: normalizeChainGPTError(error) }, { status: 500 });
  }
}
