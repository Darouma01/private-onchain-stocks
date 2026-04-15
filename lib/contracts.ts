import { parseAbi } from "viem";
import { arbitrumSepolia } from "viem/chains";

export const appChain = arbitrumSepolia;
export const chainId = 421614;
export const chainName = "Arbitrum Sepolia";
export const faucetUrl = "https://www.alchemy.com/faucets/arbitrum-sepolia";
export const explorerUrl = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.arbiscan.io";

export const caaplAddress = (
  process.env.NEXT_PUBLIC_CAAPL_TOKEN_ADDRESS ?? "0xba06720b5ce2f442c8beb26b4b150b73dbc3dccc"
) as `0x${string}`;

export const confidentialCAAPLAddress = (
  process.env.NEXT_PUBLIC_CONFIDENTIAL_CAAPL_ADDRESS ?? "0xe274cda3a9b8afbd7ea34936ed73fbef43b36d57"
) as `0x${string}`;

export const complianceAddress = (
  process.env.COMPLIANCE_CONTRACT_ADDRESS ?? "0x6dc8e010da00687ea823c1283b3fa8c9ed5436db"
) as `0x${string}`;

export const demoNoxAddress = "0x67b72c4ce71b932a1f0bffbb96beb5460b966939" as const;

export const caaplAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

export const confidentialCAAPLAbi = parseAbi([
  "function wrap(uint256 plaintextAmount, bytes noxData) returns (bytes32)",
  "function unwrap(bytes32 encryptedAmount, bytes noxData) returns (uint256)",
  "function confidentialTransfer(address to, bytes32 amount, bytes data) returns (bytes32)",
  "function settleStockTrade(address counterparty, address receiveToken, bytes32 encryptedPayAmount, bytes32 encryptedReceiveAmount, bytes payNoxData, bytes receiveNoxData) returns (bytes32)",
  "function hasMinimumBalance(address user, uint256 encryptedThreshold) view returns (bool)",
  "function distributeDividend(bytes[] encryptedAmounts, address[] holders) returns (uint256)",
  "function verifyCollateral(address user) returns (bytes)",
  "function getEncryptedBalance(address account) view returns (bytes32)",
  "function decryptBalance(address owner, bytes noxData) view returns (uint256)",
]);

export const identityRegistryAbi = parseAbi([
  "function isVerified(address investor) view returns (bool)",
  "function identity(address investor) view returns (address)",
  "function investorCountry(address investor) view returns (uint16)",
]);

export const complianceAbi = parseAbi(["function holderCount() view returns (uint256)"]);

export const demoNoxAbi = parseAbi(["function createHandle(uint256 value) returns (bytes32)"]);

export function txUrl(hash: string) {
  return `${explorerUrl}/tx/${hash}`;
}

export function addressUrl(address: string) {
  return `${explorerUrl}/address/${address}`;
}

export function shortAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
