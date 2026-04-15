import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  parseEther,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum, arbitrumSepolia } from "viem/chains";

type Artifact = {
  abi: Abi;
  bytecode: Hex;
};

type DeploymentAddresses = Record<string, Address>;

const chain = process.env.DEPLOY_CHAIN === "arbitrum" ? arbitrum : arbitrumSepolia;
const rpcUrl = requiredEnv(process.env.DEPLOY_CHAIN === "arbitrum" ? "ARBITRUM_ONE_RPC_URL" : "ARBITRUM_SEPOLIA_RPC_URL");
const privateKey = requiredEnv("PRIVATE_KEY") as Hex;
const demoInvestor1 = requiredAddress("DEMO_INVESTOR_1");
const demoInvestor2 = requiredAddress("DEMO_INVESTOR_2");
const initialMintRecipient = (process.env.INITIAL_MINT_RECIPIENT as Address | undefined) ?? demoInvestor1;
const initialMintAmount = process.env.INITIAL_MINT_AMOUNT ? BigInt(process.env.INITIAL_MINT_AMOUNT) : parseEther("100");
const maxBalancePerInvestor = process.env.MAX_BALANCE_PER_INVESTOR
  ? BigInt(process.env.MAX_BALANCE_PER_INVESTOR)
  : parseEther("1000000");
const maxHolders = process.env.MAX_HOLDERS ? BigInt(process.env.MAX_HOLDERS) : 1000n;
const kycTopic = process.env.KYC_TOPIC ? BigInt(process.env.KYC_TOPIC) : 1n;

const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

async function main() {
  console.log(`Deploying to ${chain.name} (${chain.id}) as ${account.address}`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer balance: ${balance} wei`);
  if (balance === 0n) {
    throw new Error("Deployer has no gas balance on target network");
  }

  const addresses: DeploymentAddresses = {};

  addresses.DemoClaimIssuer = await deploy("DemoInfrastructure", "DemoClaimIssuer", []);
  addresses.CAAPLClaimTopicsRegistry = await deploy("CAAPL3643Suite", "CAAPLClaimTopicsRegistry", [account.address]);
  addresses.CAAPLTrustedIssuersRegistry = await deploy("CAAPL3643Suite", "CAAPLTrustedIssuersRegistry", [account.address]);
  addresses.CAAPLIdentityRegistryStorage = await deploy("CAAPL3643Suite", "CAAPLIdentityRegistryStorage", [account.address]);
  addresses.CAAPLIdentityRegistry = await deploy("CAAPL3643Suite", "CAAPLIdentityRegistry", [
    account.address,
    addresses.CAAPLTrustedIssuersRegistry,
    addresses.CAAPLClaimTopicsRegistry,
    addresses.CAAPLIdentityRegistryStorage,
  ]);
  addresses.CAAPLCompliance = await deploy("CAAPL3643Suite", "CAAPLCompliance", [
    account.address,
    addresses.CAAPLIdentityRegistry,
    maxBalancePerInvestor,
    maxHolders,
  ]);
  addresses.CAAPLToken = await deploy("CAAPL3643Suite", "CAAPLToken", [
    account.address,
    addresses.CAAPLIdentityRegistry,
    addresses.CAAPLCompliance,
  ]);
  addresses.DemoNoxConfidentialExecutor = await deploy("DemoInfrastructure", "DemoNoxConfidentialExecutor", []);
  addresses.ConfidentialCAAPLToken = await deploy("ConfidentialCAAPLToken", "ConfidentialCAAPLToken", [
    addresses.CAAPLToken,
    addresses.DemoNoxConfidentialExecutor,
    "ipfs://confidential-caapl",
  ]);

  await configure(addresses);
  await writeDeployment(addresses);

  console.log("Deployment complete");
  console.log(JSON.stringify(addresses, null, 2));
}

async function configure(addresses: DeploymentAddresses) {
  const topics = contract("CAAPL3643Suite", "CAAPLClaimTopicsRegistry", addresses.CAAPLClaimTopicsRegistry);
  const issuers = contract("CAAPL3643Suite", "CAAPLTrustedIssuersRegistry", addresses.CAAPLTrustedIssuersRegistry);
  const storageRegistry = contract(
    "CAAPL3643Suite",
    "CAAPLIdentityRegistryStorage",
    addresses.CAAPLIdentityRegistryStorage,
  );
  const identities = contract("CAAPL3643Suite", "CAAPLIdentityRegistry", addresses.CAAPLIdentityRegistry);
  const compliance = contract("CAAPL3643Suite", "CAAPLCompliance", addresses.CAAPLCompliance);
  const caapl = contract("CAAPL3643Suite", "CAAPLToken", addresses.CAAPLToken);
  const claimIssuer = contract("DemoInfrastructure", "DemoClaimIssuer", addresses.DemoClaimIssuer);

  await write(topics, "addClaimTopic", [kycTopic]);
  await write(issuers, "addTrustedIssuer", [addresses.DemoClaimIssuer, [kycTopic]]);
  await write(storageRegistry, "bindIdentityRegistry", [addresses.CAAPLIdentityRegistry]);
  await write(compliance, "bindToken", [addresses.CAAPLToken]);

  const identitiesToRegister = [
    { wallet: demoInvestor1, identity: demoInvestor1 },
    { wallet: demoInvestor2, identity: demoInvestor2 },
    { wallet: addresses.ConfidentialCAAPLToken, identity: addresses.ConfidentialCAAPLToken },
  ];

  for (const item of identitiesToRegister) {
    await write(claimIssuer, "setClaimValidity", [item.identity, kycTopic, true]);
    await write(identities, "registerIdentity", [item.wallet, item.identity, 840]);
    await write(identities, "addClaim", [item.wallet, kycTopic, addresses.DemoClaimIssuer, "0x", "0x"]);
  }

  await write(caapl, "mint", [initialMintRecipient, initialMintAmount]);
}

async function deploy(source: string, contractName: string, args: unknown[]) {
  const artifact = await loadArtifact(source, contractName);
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args,
    account,
    chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error(`No contract address for ${contractName}`);
  }
  console.log(`${contractName}: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

async function write(contractInstance: ReturnType<typeof contract>, functionName: string, args: unknown[]) {
  const hash = await contractInstance.write[functionName](args, { account, chain });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Configured ${contractInstance.address}.${functionName}`);
}

function contract(source: string, contractName: string, address: Address) {
  return getContract({
    address,
    abi: artifactsCache.get(`${source}:${contractName}`)?.abi ?? [],
    client: { public: publicClient, wallet: walletClient },
  });
}

const artifactsCache = new Map<string, Artifact>();

async function loadArtifact(source: string, contractName: string) {
  const key = `${source}:${contractName}`;
  const cached = artifactsCache.get(key);
  if (cached) {
    return cached;
  }

  const prefix = `contracts_src_${source}_sol_${contractName}`;
  const abi = JSON.parse(await readFile(join("build", "solc", `${prefix}.abi`), "utf8")) as Abi;
  const bin = (await readFile(join("build", "solc", `${prefix}.bin`), "utf8")).trim();
  const artifact = { abi, bytecode: `0x${bin}` as Hex };
  artifactsCache.set(key, artifact);
  return artifact;
}

async function writeDeployment(addresses: DeploymentAddresses) {
  const dir = join("deployments", String(chain.id));
  await mkdir(dir, { recursive: true });
  const payload = {
    chainId: chain.id,
    chainName: chain.name,
    deployer: account.address,
    initialMintRecipient,
    initialMintAmount: initialMintAmount.toString(),
    addresses,
  };
  await writeFile(join(dir, "addresses.json"), `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(
    join(dir, "frontend.env"),
    [
      `NEXT_PUBLIC_CHAIN_ID=${chain.id}`,
      `NEXT_PUBLIC_CAAPL_TOKEN_ADDRESS=${addresses.CAAPLToken}`,
      `NEXT_PUBLIC_CONFIDENTIAL_CAAPL_ADDRESS=${addresses.ConfidentialCAAPLToken}`,
      `NEXT_PUBLIC_BLOCK_EXPLORER_URL=${chain.id === 421614 ? "https://sepolia.arbiscan.io" : "https://arbiscan.io"}`,
      `COMPLIANCE_CONTRACT_ADDRESS=${addresses.CAAPLCompliance}`,
      "",
    ].join("\n"),
  );
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function requiredAddress(name: string) {
  const value = requiredEnv(name);
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} must be an EVM address`);
  }
  return value as Address;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
