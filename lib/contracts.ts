import { parseAbi } from "viem";
import { arbitrumSepolia } from "viem/chains";

export const appChain = arbitrumSepolia;
export const chainId = 421614;
export const chainName = "Arbitrum Sepolia";
export const faucetUrl = "https://www.alchemy.com/faucets/arbitrum-sepolia";
export const explorerUrl = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.arbiscan.io";

export const caaplAddress = (
  process.env.NEXT_PUBLIC_CAAPL_TOKEN_ADDRESS ?? "0xf20a8f2e9f4127c6e83aab89106d09d8c26af6a9"
) as `0x${string}`;

export const confidentialCAAPLAddress = (
  process.env.NEXT_PUBLIC_CONFIDENTIAL_CAAPL_ADDRESS ?? "0x136baba4f0037e2f42121bf3d2c0c117dbe7ae83"
) as `0x${string}`;

export const complianceAddress = (
  process.env.COMPLIANCE_CONTRACT_ADDRESS ?? "0x44d4886856c2e2b06a3515fa37fa8e0781f252d5"
) as `0x${string}`;

export const demoNoxAddress = "0x997cd0d393fce9c3726ccdb02cc94f9b222f4182" as const;

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
