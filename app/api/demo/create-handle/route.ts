import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, getContract, http, isAddress, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { demoNoxAddress } from "@/lib/contracts";

export const runtime = "nodejs";

const demoNoxAbi = parseAbi([
  "function createHandle(uint256 value) returns (bytes32)",
  "event HandleCreated(bytes32 indexed handle)",
]);

export async function POST(request: Request) {
  try {
    const { amount, noxAddress } = (await request.json()) as { amount?: string; noxAddress?: string };
    if (!amount || !/^\d+$/.test(amount)) {
      return NextResponse.json({ error: "Amount must be a wei integer string" }, { status: 400 });
    }
    const targetNoxAddress = resolveNoxAddress(noxAddress);

    const privateKey = process.env.PRIVATE_KEY as Hex | undefined;
    const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL ?? process.env.RPC_URL;
    if (!privateKey || !rpcUrl) {
      return NextResponse.json({ error: "Server wallet or Arbitrum Sepolia RPC is not configured" }, { status: 500 });
    }

    const account = privateKeyToAccount(privateKey);
    const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(rpcUrl) });
    const contract = getContract({
      address: targetNoxAddress,
      abi: demoNoxAbi,
      client: { public: publicClient, wallet: walletClient },
    });

    const hash = await contract.write.createHandle([BigInt(amount)], { account, chain: arbitrumSepolia });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const handle = receipt.logs.find((log) => log.address.toLowerCase() === targetNoxAddress.toLowerCase())?.topics[1];

    if (!handle) {
      return NextResponse.json({ error: "Handle event was not found", transactionHash: hash }, { status: 500 });
    }

    return NextResponse.json({ handle, transactionHash: hash });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Handle creation failed" }, { status: 500 });
  }
}

function resolveNoxAddress(candidate?: string) {
  if (candidate && isAddress(candidate)) {
    return candidate as Address;
  }
  return demoNoxAddress;
}
