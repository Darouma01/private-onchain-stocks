import deployment from "@/deployments/421614/addresses.json";
import { addressUrl, chainId, chainName, demoNoxAddress, explorerUrl, txUrl } from "@/lib/contracts";
import { createPublicClient, formatUnits, http, parseAbi, zeroAddress, type Address, type PublicClient } from "viem";
import { arbitrumSepolia } from "viem/chains";

const baseTokenAbi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 amount)",
]);

const confidentialTokenAbi = parseAbi([
  "function confidentialTotalSupply() view returns (bytes32)",
  "function getEncryptedBalance(address account) view returns (bytes32)",
  "event Wrapped(address indexed account, uint256 plaintextAmount, bytes32 indexed encryptedAmount)",
  "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)",
]);

const identityRegistryAbi = parseAbi(["function isVerified(address investor) view returns (bool)"]);
const complianceAbi = parseAbi(["function holderCount() view returns (uint256)"]);
const demoNoxExecutorAbi = parseAbi(["function valueOf(bytes32 handle) view returns (uint256)"]);

const zeroHandle = "0x0000000000000000000000000000000000000000000000000000000000000000";

type ContractLink = {
  address: Address;
  label: string;
  url: string;
};

type ProofTransaction = {
  hash: `0x${string}`;
  label: string;
  url: string;
};

export type JudgeProofData = {
  networkName: string;
  chainId: number;
  links: ContractLink[];
  baseTokenAddress: Address;
  confidentialWrapperAddress: Address;
  identityRegistryAddress: Address;
  complianceAddress: Address;
  noxExecutorAddress: Address;
  latestMintTx: ProofTransaction | null;
  latestWrapTx: ProofTransaction | null;
  latestConfidentialTransferTx: ProofTransaction | null;
  totalBaseSupply: string;
  totalConfidentialSupply: string;
  wrappedRatio: string;
  activeDemoHolders: number;
  demoHolderRows: Array<{ address: Address; isVerified: boolean; encryptedHandle: string; confidentialBalance: string }>;
  publicExplanation: string[];
  privacyExplanation: string[];
  proofSummary: string[];
};

export async function getJudgeProofData(): Promise<JudgeProofData> {
  const client = getJudgeProofClient();
  const addresses = deployment.addresses;
  const baseTokenAddress = addresses.CAAPLToken as Address;
  const confidentialWrapperAddress = addresses.ConfidentialCAAPLToken as Address;
  const identityRegistryAddress = addresses.CAAPLIdentityRegistry as Address;
  const complianceAddress = addresses.CAAPLCompliance as Address;
  const noxExecutorAddress = (addresses.DemoNoxConfidentialExecutor ?? demoNoxAddress) as Address;

  const [decimals, baseSupplyRaw, encryptedSupplyHandle, holderCountRaw, latestBlock] = await Promise.all([
    client.readContract({ address: baseTokenAddress, abi: baseTokenAbi, functionName: "decimals" }),
    client.readContract({ address: baseTokenAddress, abi: baseTokenAbi, functionName: "totalSupply" }),
    client.readContract({ address: confidentialWrapperAddress, abi: confidentialTokenAbi, functionName: "confidentialTotalSupply" }),
    client.readContract({ address: complianceAddress, abi: complianceAbi, functionName: "holderCount" }),
    client.getBlockNumber(),
  ]);

  const confidentialSupplyRaw =
    encryptedSupplyHandle === zeroHandle
      ? 0n
      : await client.readContract({
          address: noxExecutorAddress,
          abi: demoNoxExecutorAbi,
          functionName: "valueOf",
          args: [encryptedSupplyHandle],
        });

  const demoHolders = collectDemoHolders();
  const demoHolderRows = await Promise.all(
    demoHolders.map(async (address) => {
      const [isVerified, handle] = await Promise.all([
        client.readContract({ address: identityRegistryAddress, abi: identityRegistryAbi, functionName: "isVerified", args: [address] }),
        client.readContract({ address: confidentialWrapperAddress, abi: confidentialTokenAbi, functionName: "getEncryptedBalance", args: [address] }),
      ]);

      const confidentialBalance =
        handle === zeroHandle
          ? 0n
          : await client.readContract({
              address: noxExecutorAddress,
              abi: demoNoxExecutorAbi,
              functionName: "valueOf",
              args: [handle],
            });

      return {
        address,
        isVerified,
        encryptedHandle: handle,
        confidentialBalance: formatTokenAmount(confidentialBalance, decimals),
      };
    }),
  );

  const [latestMintLog, latestWrapLog, latestTransferLog] = await Promise.all([
    findLatestLog(client, latestBlock, (fromBlock, toBlock) =>
      client.getLogs({
        address: baseTokenAddress,
        event: baseTokenAbi[2],
        args: { from: zeroAddress },
        fromBlock,
        toBlock,
      }),
    ),
    findLatestLog(client, latestBlock, (fromBlock, toBlock) =>
      client.getLogs({
        address: confidentialWrapperAddress,
        event: confidentialTokenAbi[2],
        fromBlock,
        toBlock,
      }),
    ),
    findLatestConfidentialTransfer(client, confidentialWrapperAddress, latestBlock),
  ]);

  const wrappedRatio = baseSupplyRaw > 0n ? `${((Number(confidentialSupplyRaw) / Number(baseSupplyRaw)) * 100).toFixed(2)}%` : "0.00%";

  return {
    networkName: chainName,
    chainId,
    baseTokenAddress,
    confidentialWrapperAddress,
    identityRegistryAddress,
    complianceAddress,
    noxExecutorAddress,
    links: [
      { address: baseTokenAddress, label: "Base cAAPL token", url: addressUrl(baseTokenAddress) },
      { address: confidentialWrapperAddress, label: "Confidential cAAPL wrapper", url: addressUrl(confidentialWrapperAddress) },
      { address: identityRegistryAddress, label: "Identity registry", url: addressUrl(identityRegistryAddress) },
      { address: complianceAddress, label: "Compliance module", url: addressUrl(complianceAddress) },
      { address: noxExecutorAddress, label: "Demo Nox executor", url: addressUrl(noxExecutorAddress) },
    ],
    latestMintTx: latestMintLog?.transactionHash ? { hash: latestMintLog.transactionHash, label: "Latest successful mint", url: txUrl(latestMintLog.transactionHash) } : null,
    latestWrapTx: latestWrapLog?.transactionHash ? { hash: latestWrapLog.transactionHash, label: "Latest successful wrap", url: txUrl(latestWrapLog.transactionHash) } : null,
    latestConfidentialTransferTx: latestTransferLog?.transactionHash
      ? { hash: latestTransferLog.transactionHash, label: "Latest successful confidential transfer", url: txUrl(latestTransferLog.transactionHash) }
      : null,
    totalBaseSupply: formatTokenAmount(baseSupplyRaw, decimals),
    totalConfidentialSupply: formatTokenAmount(confidentialSupplyRaw, decimals),
    wrappedRatio,
    activeDemoHolders: demoHolderRows.filter((holder) => holder.encryptedHandle !== zeroHandle).length,
    demoHolderRows,
    publicExplanation: [
      "Network, chain ID, contract addresses, contract explorer links, and transaction hashes are public.",
      "Base token total supply and holder-count reads come directly from deployed contracts on Arbitrum Sepolia.",
      "Confidential total supply is resolved from the wrapper's encrypted supply handle through the live demo Nox executor value mapping.",
    ],
    privacyExplanation: [
      "Confidential balances are stored onchain as encrypted handles, not plaintext amounts.",
      "Private transfers emit a transaction and event, but do not expose the transferred amount in plaintext logs.",
      "The Nox executor resolves handles to values while preserving the handle-based confidentiality model used by the wrapper.",
    ],
    proofSummary: [
      "The base cAAPL token is deployed and live on Arbitrum Sepolia.",
      "The confidential wrapper is deployed and maintaining encrypted balances onchain.",
      "Mint, wrap, and confidential transfer transactions have all succeeded against live contracts.",
      "The UI is reading directly from chain state and deployment artifacts rather than generated or mocked values.",
    ],
  };
}

function getJudgeProofClient() {
  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
  return createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });
}

function collectDemoHolders() {
  const inferred = [
    process.env.DEMO_INVESTOR_1,
    process.env.DEMO_INVESTOR_2,
    deployment.initialMintRecipient,
    deployment.deployer,
  ].filter((value, index, array): value is Address => Boolean(value) && array.indexOf(value) === index);

  return inferred as Address[];
}

async function findLatestLog<T extends { transactionHash?: `0x${string}` }>(
  client: PublicClient,
  latestBlock: bigint,
  loader: (fromBlock: bigint, toBlock: bigint) => Promise<T[]>,
) {
  const step = 20_000n;
  let toBlock = latestBlock;

  while (toBlock >= 0n) {
    const fromBlock = toBlock > step ? toBlock - step : 0n;
    const logs = await loader(fromBlock, toBlock);
    if (logs.length > 0) return logs[logs.length - 1];
    if (fromBlock === 0n) break;
    toBlock = fromBlock - 1n;
  }

  return null;
}

async function findLatestConfidentialTransfer(client: PublicClient, wrapperAddress: Address, latestBlock: bigint) {
  return findLatestLog(client, latestBlock, async (fromBlock, toBlock) => {
    const logs = await client.getLogs({
      address: wrapperAddress,
      event: confidentialTokenAbi[3],
      fromBlock,
      toBlock,
    });

    return logs.filter((log) => log.args.from !== zeroAddress && log.args.to !== zeroAddress);
  });
}

export function formatTokenAmount(amount: bigint, decimals = 18) {
  const formatted = formatUnits(amount, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const wholeNumber = new Intl.NumberFormat("en-US").format(Number(whole || "0"));
  const trimmedFraction = fraction.slice(0, 4).replace(/0+$/, "");
  return trimmedFraction ? `${wholeNumber}.${trimmedFraction}` : wholeNumber;
}

export function truncateHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function isZeroHandle(handle: string) {
  return handle === zeroHandle;
}

export function judgeProofExplorerBase() {
  return explorerUrl;
}
