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
import { AssetCategory, assets, assertAssetRegistryComplete, type AssetConfig } from "../deploy/assets.config";

type Artifact = {
  abi: Abi;
  bytecode: Hex;
};

type ResumeState = {
  chainId: number;
  network: string;
  deployer: Address;
  deployed: Record<string, Address>;
  wrappers: Record<string, Address>;
  modules: Record<string, Address>;
};

const chain = process.env.DEPLOY_CHAIN === "arbitrum" ? arbitrum : arbitrumSepolia;
const networkName = chain.id === arbitrum.id ? "arbitrumOne" : "arbitrumSepolia";
const rpcUrl = requiredEnv(chain.id === arbitrum.id ? "ARBITRUM_ONE_RPC_URL" : "ARBITRUM_SEPOLIA_RPC_URL");
const privateKey = requiredEnv("PRIVATE_KEY") as Hex;
const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

const resumePath = join("deployments", `${networkName}-61-assets.resume.json`);
const outputPath = join("deployments", chain.id === 421614 ? "sepolia-61-assets.json" : "mainnet-61-assets.json");
const chainDir = join("deployments", String(chain.id));
const demoInvestor1 = optionalAddress("DEMO_INVESTOR_1");
const demoInvestor2 = optionalAddress("DEMO_INVESTOR_2");
const initialMintAmount = process.env.INITIAL_MINT_AMOUNT ? BigInt(process.env.INITIAL_MINT_AMOUNT) : parseEther("100");

async function main() {
  assertAssetRegistryComplete();
  const selectedAssets = selectAssets();
  const state = await loadResumeState();

  console.log(`Deploying Private Onchain Stocks 61-asset stack to ${chain.name} (${chain.id})`);
  console.log(`Deployer: ${account.address}`);
  console.log(`Assets selected: ${selectedAssets.length}`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer balance: ${balance} wei`);
  if (balance === 0n) {
    throw new Error("Deployer has no gas balance on target network");
  }

  state.modules.SharedIdentityRegistry ??= await deploy("IdentityRegistry", "SharedIdentityRegistry", [account.address]);
  state.modules.AssetRegistry ??= await deploy("AssetRegistry", "AssetRegistry", [account.address]);
  state.modules.ComplianceModule ??= await deploy("ComplianceModule", "ComplianceModule", [
    account.address,
    state.modules.SharedIdentityRegistry,
  ]);
  state.modules.PriceFeedModule ??= await deploy("PriceFeedModule", "PriceFeedModule", [account.address]);
  state.modules.AssetFactory ??= await deploy("AssetFactory", "AssetFactory", [
    account.address,
    state.modules.AssetRegistry,
    state.modules.ComplianceModule,
  ]);
  state.modules.NoxExecutor ??= (process.env.NOX_EXECUTOR_ADDRESS as Address | undefined) ?? await deploy("DemoNoxExecutor", "DemoNoxExecutor", []);
  state.modules.ConfidentialWrapperFactory ??= await deploy("ConfidentialWrapperFactory", "ConfidentialWrapperFactory", [
    account.address,
    state.modules.NoxExecutor,
  ]);
  await saveResumeState(state);

  await configureModulePermissions(state);
  await configureDemoIdentities(state);
  await deployAssets(state, selectedAssets);
  await deployWrappers(state, selectedAssets);
  await configureWrapperIdentities(state, selectedAssets);
  await mintDemoBalances(state, selectedAssets);
  await writeDeploymentOutput(state, selectedAssets);

  console.log("61-asset deployment script complete");
}

function selectAssets() {
  const symbols = process.env.DEPLOY_SYMBOLS?.split(",").map((symbol) => symbol.trim()).filter(Boolean);
  const limit = process.env.DEPLOY_ASSET_LIMIT ? Number(process.env.DEPLOY_ASSET_LIMIT) : undefined;
  const filtered = symbols?.length ? assets.filter((asset) => symbols.includes(asset.symbol)) : assets;
  return typeof limit === "number" && Number.isFinite(limit) ? filtered.slice(0, limit) : filtered;
}

async function configureModulePermissions(state: ResumeState) {
  const registry = await deployedContract("AssetRegistry", "AssetRegistry", state.modules.AssetRegistry);
  const compliance = await deployedContract("ComplianceModule", "ComplianceModule", state.modules.ComplianceModule);
  const registrarRole = await registry.read.REGISTRAR_ROLE();

  await write(registry, "grantRole", [registrarRole, state.modules.AssetFactory], "AssetRegistry.grantRole(factory)");
  await write(compliance, "setAssetConfigurer", [state.modules.AssetFactory, true], "ComplianceModule.setAssetConfigurer(factory)");
}

async function configureDemoIdentities(state: ResumeState) {
  const identities = await deployedContract("IdentityRegistry", "SharedIdentityRegistry", state.modules.SharedIdentityRegistry);
  const demoWallets = [account.address, demoInvestor1, demoInvestor2].filter(Boolean) as Address[];
  for (const wallet of demoWallets) {
    await write(identities, "setIdentity", [wallet, true, 840, true, true], `IdentityRegistry.setIdentity(${wallet})`);
  }
}

async function deployAssets(state: ResumeState, selectedAssets: AssetConfig[]) {
  const missing = selectedAssets.filter((asset) => !state.deployed[asset.symbol]);
  if (missing.length === 0) {
    console.log("All selected base assets already deployed");
    return;
  }

  const factory = await deployedContract("AssetFactory", "AssetFactory", state.modules.AssetFactory);
  for (const asset of missing) {
    await write(factory, "deployAsset", [toSolidityConfig(asset)], `AssetFactory.deployAsset(${asset.symbol})`);
    const address = await factory.read.getAssetAddress([asset.symbol]) as Address;
    state.deployed[asset.symbol] = address;
    console.log(`${asset.symbol}: ${address}`);
    await saveResumeState(state);
  }
}

async function deployWrappers(state: ResumeState, selectedAssets: AssetConfig[]) {
  const missing = selectedAssets.filter((asset) => !state.wrappers[asset.symbol]);
  if (missing.length === 0) {
    console.log("All selected confidential wrappers already deployed");
    return;
  }

  const wrapperFactory = await deployedContract(
    "ConfidentialWrapperFactory",
    "ConfidentialWrapperFactory",
    state.modules.ConfidentialWrapperFactory,
  );

  for (const asset of missing) {
    await write(
      wrapperFactory,
      "wrapAsset",
      [state.deployed[asset.symbol]],
      `ConfidentialWrapperFactory.wrapAsset(${asset.symbol})`,
    );
    const wrapper = await wrapperFactory.read.wrapperOf([state.deployed[asset.symbol]]) as Address;
    state.wrappers[asset.symbol] = wrapper;
    console.log(`${asset.symbol} wrapper: ${wrapper}`);
    await saveResumeState(state);
  }
}

async function configureWrapperIdentities(state: ResumeState, selectedAssets: AssetConfig[]) {
  const identities = await deployedContract("IdentityRegistry", "SharedIdentityRegistry", state.modules.SharedIdentityRegistry);
  for (const asset of selectedAssets) {
    const wrapper = state.wrappers[asset.symbol];
    if (wrapper && asset.requiresKYC) {
      await write(identities, "setIdentity", [wrapper, true, 840, true, true], `IdentityRegistry.setIdentity(${asset.symbol} wrapper)`);
    }
  }
}

async function mintDemoBalances(state: ResumeState, selectedAssets: AssetConfig[]) {
  const recipient = demoInvestor1 ?? account.address;
  for (const asset of selectedAssets) {
    const token = await deployedContract("BaseConfidentialToken", "BaseConfidentialToken", state.deployed[asset.symbol]);
    const currentBalance = await token.read.balanceOf([recipient]) as bigint;
    if (currentBalance > 0n) {
      continue;
    }
    await write(token, "mint", [recipient, initialMintAmount], `${asset.symbol}.mint(demo)`);
  }
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

async function write(contractInstance: ReturnType<typeof contract>, functionName: string, args: unknown[], label: string) {
  try {
    const hash = await contractInstance.write[functionName](args, { account, chain });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Configured ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already has role|AccessControlUnauthorizedAccount|symbol exists|wrapper exists/i.test(message)) {
      console.log(`Skipped ${label}: ${message.split("\n")[0]}`);
      return;
    }
    throw error;
  }
}

async function deployedContract(source: string, contractName: string, address: Address) {
  await loadArtifact(source, contractName);
  return contract(source, contractName, address);
}

function contract(source: string, contractName: string, address: Address) {
  return getContract({
    address,
    abi: artifactsCache.get(`${source}:${contractName}`)?.abi ?? [],
    client: { public: publicClient, wallet: walletClient },
  });
}

function toSolidityConfig(asset: AssetConfig) {
  return {
    name: asset.name,
    symbol: asset.symbol,
    category: categoryToSolidity(asset.category),
    priceFeed: asset.priceFeed,
    maxHolders: asset.maxHolders,
    blockedCountries: asset.blockedCountries,
    requiresKYC: asset.requiresKYC,
  };
}

function categoryToSolidity(category: AssetCategory) {
  return {
    [AssetCategory.STOCK_US]: 0,
    [AssetCategory.STOCK_INTL]: 1,
    [AssetCategory.CRYPTO]: 2,
    [AssetCategory.COMMODITY]: 3,
    [AssetCategory.STABLECOIN]: 4,
  }[category];
}

const artifactsCache = new Map<string, Artifact>();

async function loadArtifact(source: string, contractName: string) {
  const key = `${source}:${contractName}`;
  const cached = artifactsCache.get(key);
  if (cached) {
    return cached;
  }

  const prefix = artifactPrefix(source, contractName);
  const abi = JSON.parse(await readFile(join("build", "solc", `${prefix}.abi`), "utf8")) as Abi;
  const bin = (await readFile(join("build", "solc", `${prefix}.bin`), "utf8")).trim();
  const artifact = { abi, bytecode: `0x${bin}` as Hex };
  artifactsCache.set(key, artifact);
  return artifact;
}

function artifactPrefix(source: string, contractName: string) {
  return {
    IdentityRegistry: `contracts_core_IdentityRegistry_sol_${contractName}`,
    AssetRegistry: `contracts_core_AssetRegistry_sol_${contractName}`,
    ComplianceModule: `contracts_modules_ComplianceModule_sol_${contractName}`,
    PriceFeedModule: `contracts_modules_PriceFeedModule_sol_${contractName}`,
    AssetFactory: `contracts_core_AssetFactory_sol_${contractName}`,
    DemoNoxExecutor: `contracts_modules_DemoNoxExecutor_sol_${contractName}`,
    ConfidentialWrapperFactory: `contracts_core_ConfidentialWrapperFactory_sol_${contractName}`,
    BaseConfidentialToken: `contracts_core_BaseConfidentialToken_sol_${contractName}`,
  }[source] ?? source;
}

async function loadResumeState(): Promise<ResumeState> {
  try {
    const parsed = JSON.parse(await readFile(resumePath, "utf8")) as Partial<ResumeState>;
    return {
      chainId: chain.id,
      network: networkName,
      deployer: account.address,
      deployed: parsed.deployed ?? {},
      wrappers: parsed.wrappers ?? {},
      modules: parsed.modules ?? {},
    };
  } catch {
    return { chainId: chain.id, network: networkName, deployer: account.address, deployed: {}, wrappers: {}, modules: {} };
  }
}

async function saveResumeState(state: ResumeState) {
  await mkdir("deployments", { recursive: true });
  await writeFile(resumePath, `${JSON.stringify(state, null, 2)}\n`);
}

async function writeDeploymentOutput(state: ResumeState, selectedAssets: AssetConfig[]) {
  await mkdir("deployments", { recursive: true });
  await mkdir(chainDir, { recursive: true });
  const selectedSymbols = selectedAssets.map((asset) => asset.symbol);
  const payload = {
    chainId: chain.id,
    chainName: chain.name,
    deployer: account.address,
    selectedSymbols,
    modules: state.modules,
    assets: Object.fromEntries(selectedSymbols.map((symbol) => [symbol, state.deployed[symbol]])),
    wrappers: Object.fromEntries(selectedSymbols.map((symbol) => [symbol, state.wrappers[symbol]])),
  };

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(join(chainDir, "asset-addresses.json"), `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(
    join(chainDir, "frontend-61-assets.env"),
    [
      `NEXT_PUBLIC_CHAIN_ID=${chain.id}`,
      `NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS=${state.modules.AssetRegistry}`,
      `NEXT_PUBLIC_ASSET_FACTORY_ADDRESS=${state.modules.AssetFactory}`,
      `NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_FACTORY_ADDRESS=${state.modules.ConfidentialWrapperFactory}`,
      `NEXT_PUBLIC_NOX_EXECUTOR_ADDRESS=${state.modules.NoxExecutor}`,
      `NEXT_PUBLIC_BLOCK_EXPLORER_URL=${chain.id === 421614 ? "https://sepolia.arbiscan.io" : "https://arbiscan.io"}`,
      "",
    ].join("\n"),
  );
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${join(chainDir, "asset-addresses.json")}`);
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalAddress(name: string) {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} must be an EVM address`);
  }
  return value as Address;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
