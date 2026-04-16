import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AssetCategory, assets, assertAssetRegistryComplete, type AssetConfig } from "../deploy/assets.config";

type ResumeState = {
  chainId: number;
  network: string;
  deployed: Record<string, string>;
  modules: Record<string, string>;
};

type HardhatRuntime = {
  ethers: {
    getContractFactory: (name: string) => Promise<{
      deploy: (...args: unknown[]) => Promise<{ waitForDeployment: () => Promise<void>; getAddress: () => Promise<string> }>;
      attach: (address: string) => Record<string, (...args: unknown[]) => Promise<unknown>>;
    }>;
    getSigners: () => Promise<Array<{ address: string }>>;
  };
  run: (task: string, args?: Record<string, unknown>) => Promise<unknown>;
};

const networkName = process.env.DEPLOY_CHAIN === "arbitrum" ? "arbitrumOne" : "arbitrumSepolia";
const chainId = networkName === "arbitrumOne" ? 42161 : 421614;
const outputPath = networkName === "arbitrumOne" ? "deployments/mainnet.json" : "deployments/sepolia.json";
const resumePath = join("deployments", `${networkName}.resume.json`);

async function main() {
  assertAssetRegistryComplete();
  const hre = await loadHardhatRuntime();
  const [deployer] = await hre.ethers.getSigners();
  const state = await loadResumeState();

  console.log(`Deploying Private Onchain Stocks to ${networkName} (${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Asset count: ${assets.length}`);

  await estimateGas(assets);

  state.modules.IdentityRegistry ??= await deployModule(hre, "SharedIdentityRegistry", [deployer.address]);
  state.modules.AssetRegistry ??= await deployModule(hre, "AssetRegistry", [deployer.address]);
  state.modules.ComplianceModule ??= await deployModule(hre, "ComplianceModule", [
    deployer.address,
    state.modules.IdentityRegistry,
  ]);
  state.modules.PriceFeedModule ??= await deployModule(hre, "PriceFeedModule", [deployer.address]);
  state.modules.AssetFactory ??= await deployModule(hre, "AssetFactory", [
    deployer.address,
    state.modules.AssetRegistry,
    state.modules.ComplianceModule,
  ]);

  await configureFactoryPermissions(hre, state);
  await saveResumeState(state);

  if (Object.keys(state.deployed).length === 0) {
    await batchDeployAssets(hre, state, assets);
  } else {
    for (const asset of assets) {
      if (state.deployed[asset.symbol]) {
        console.log(`Skipping ${asset.symbol}: ${state.deployed[asset.symbol]}`);
        continue;
      }
      state.deployed[asset.symbol] = await deployAsset(hre, state.modules.AssetFactory, asset);
      await saveResumeState(state);
    }
  }

  await writeDeploymentOutput(state);
  await verifyAll(hre, state);
}

async function loadHardhatRuntime() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  try {
    return (await dynamicImport("hardhat")) as HardhatRuntime;
  } catch {
    throw new Error("Hardhat is not installed. Install hardhat and @nomicfoundation/hardhat-toolbox before running this script.");
  }
}

async function estimateGas(configs: AssetConfig[]) {
  console.log(`Gas estimate step: ${configs.length} assets queued. Run against a fork before mainnet deployment.`);
}

async function deployModule(hre: HardhatRuntime, contractName: string, args: unknown[]) {
  const factory = await hre.ethers.getContractFactory(contractName);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`${contractName}: ${address}`);
  return address;
}

async function configureFactoryPermissions(hre: HardhatRuntime, state: ResumeState) {
  const registryFactory = await hre.ethers.getContractFactory("AssetRegistry");
  const registry = registryFactory.attach(state.modules.AssetRegistry);
  const registrarRole = await registry.REGISTRAR_ROLE();
  await waitFor(registry.grantRole(registrarRole, state.modules.AssetFactory));

  const complianceFactory = await hre.ethers.getContractFactory("ComplianceModule");
  const compliance = complianceFactory.attach(state.modules.ComplianceModule);
  await waitFor(compliance.setAssetConfigurer(state.modules.AssetFactory, true));
}

async function batchDeployAssets(hre: HardhatRuntime, state: ResumeState, configs: AssetConfig[]) {
  const factoryFactory = await hre.ethers.getContractFactory("AssetFactory");
  const factory = factoryFactory.attach(state.modules.AssetFactory);
  console.log(`Calling batchDeployAssets for ${configs.length} assets`);
  await waitFor(factory.batchDeployAssets(configs.map(toSolidityConfig)));

  for (const asset of configs) {
    const address = (await factory.getAssetAddress(asset.symbol)) as string;
    state.deployed[asset.symbol] = address;
    console.log(`${asset.symbol}: ${address}`);
  }
  await saveResumeState(state);
}

async function deployAsset(hre: HardhatRuntime, factoryAddress: string, asset: AssetConfig): Promise<string> {
  const factoryFactory = await hre.ethers.getContractFactory("AssetFactory");
  const factory = factoryFactory.attach(factoryAddress);
  await waitFor(factory.deployAsset(toSolidityConfig(asset)));
  const address = (await factory.getAssetAddress(asset.symbol)) as string;
  console.log(`${asset.symbol}: ${address}`);
  return address;
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

async function waitFor(result: unknown) {
  const tx = result as { wait?: () => Promise<unknown> };
  if (tx.wait) {
    await tx.wait();
  }
}

async function verifyAll(hre: HardhatRuntime, state: ResumeState) {
  for (const [name, address] of Object.entries(state.modules)) {
    await safeVerify(hre, name, address, []);
  }
  for (const [symbol, address] of Object.entries(state.deployed)) {
    await safeVerify(hre, symbol, address, []);
  }
}

async function safeVerify(hre: HardhatRuntime, label: string, address: string, constructorArguments: unknown[]) {
  try {
    await hre.run("verify:verify", { address, constructorArguments });
    console.log(`Verified ${label}: ${address}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already verified/i.test(message)) {
      console.log(`Already verified ${label}: ${address}`);
      return;
    }
    console.warn(`Verification skipped for ${label}: ${message}`);
  }
}

async function loadResumeState(): Promise<ResumeState> {
  try {
    return JSON.parse(await readFile(resumePath, "utf8")) as ResumeState;
  } catch {
    return { chainId, network: networkName, deployed: {}, modules: {} };
  }
}

async function saveResumeState(state: ResumeState) {
  await mkdir("deployments", { recursive: true });
  await writeFile(resumePath, `${JSON.stringify(state, null, 2)}\n`);
}

async function writeDeploymentOutput(state: ResumeState) {
  await mkdir("deployments", { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
