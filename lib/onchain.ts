import { createPublicClient, formatUnits, http, parseAbi, type Address } from "viem";
import { arbitrum, base, mainnet, polygon, sepolia } from "viem/chains";

export const erc20Abi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export const complianceAbi = parseAbi(["function holderCount() view returns (uint256)"]);

export const confidentialTransferEventAbi = parseAbi([
  "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)",
]);

export function getConfiguredChain() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "1");
  const chains = [mainnet, sepolia, arbitrum, base, polygon];
  return chains.find((chain) => chain.id === chainId) ?? mainnet;
}

export function getPublicClient() {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error("RPC_URL is not configured");
  }

  return createPublicClient({
    chain: getConfiguredChain(),
    transport: http(rpcUrl),
  });
}

export function getRequiredAddress(value: string | undefined, envName: string): Address {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${envName} is not configured`);
  }
  return value as Address;
}

export function anonymizeAddress(address: string) {
  if (address === "0x0000000000000000000000000000000000000000") {
    return "mint/burn";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(amount: bigint, decimals: number) {
  const formatted = formatUnits(amount, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmedFraction = fraction.slice(0, 4).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}
