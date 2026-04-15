import { NextResponse } from "next/server";
import { getContract, type Address } from "viem";
import { createGeneralChatClient, extractBotText, normalizeChainGPTError } from "@/lib/chaingpt";
import { buildInsightsQuestion } from "@/lib/project-context";
import {
  anonymizeAddress,
  complianceAbi,
  confidentialTransferEventAbi,
  erc20Abi,
  formatTokenAmount,
  getPublicClient,
  getRequiredAddress,
} from "@/lib/onchain";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = getPublicClient();
    const caaplAddress = getRequiredAddress(process.env.NEXT_PUBLIC_CAAPL_TOKEN_ADDRESS, "NEXT_PUBLIC_CAAPL_TOKEN_ADDRESS");
    const confidentialAddress = getRequiredAddress(
      process.env.NEXT_PUBLIC_CONFIDENTIAL_CAAPL_ADDRESS,
      "NEXT_PUBLIC_CONFIDENTIAL_CAAPL_ADDRESS",
    );
    const complianceAddress = process.env.COMPLIANCE_CONTRACT_ADDRESS
      ? getRequiredAddress(process.env.COMPLIANCE_CONTRACT_ADDRESS, "COMPLIANCE_CONTRACT_ADDRESS")
      : undefined;

    const token = getContract({ address: caaplAddress, abi: erc20Abi, client });
    const [symbol, decimals, totalSupply, blockNumber] = await Promise.all([
      token.read.symbol(),
      token.read.decimals(),
      token.read.totalSupply(),
      client.getBlockNumber(),
    ]);

    const holderCount = complianceAddress ? await readHolderCount(client, complianceAddress) : undefined;
    const fromBlock = blockNumber > 5_000n ? blockNumber - 5_000n : 0n;
    const logs = await client.getLogs({
      address: confidentialAddress,
      event: confidentialTransferEventAbi[0],
      fromBlock,
      toBlock: blockNumber,
    });

    const recentActivity = logs
      .slice(-10)
      .reverse()
      .map((log) => ({
        from: anonymizeAddress(log.args.from ?? "0x0000000000000000000000000000000000000000"),
        to: anonymizeAddress(log.args.to ?? "0x0000000000000000000000000000000000000000"),
        amountHandle: log.args.amount ?? "0x",
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
      }));

    const aggregatePayload = {
      tokenSymbol: symbol,
      totalSupply: formatTokenAmount(totalSupply, decimals),
      holderCount: holderCount?.toString() ?? "not configured",
      confidentialTransferCount: logs.length,
      recentActivity,
      privacyNote:
        "Recent transfer activity is anonymized and uses encrypted amount handles only. No individual confidential balances are included.",
    };

    const chat = createGeneralChatClient();
    const response = await chat.createChatBlob({
      question: buildInsightsQuestion(aggregatePayload),
      chatHistory: "off",
    });

    return NextResponse.json({
      ...aggregatePayload,
      aiSummary: extractBotText(response),
    });
  } catch (error) {
    return NextResponse.json({ error: normalizeChainGPTError(error) }, { status: 500 });
  }
}

async function readHolderCount(client: ReturnType<typeof getPublicClient>, address: Address) {
  const compliance = getContract({ address, abi: complianceAbi, client });
  return compliance.read.holderCount();
}
