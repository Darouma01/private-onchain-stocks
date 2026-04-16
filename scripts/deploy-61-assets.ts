import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assets, assertAssetRegistryComplete, type AssetConfig } from "../deploy/assets.config";

type ResumeState = {
  chainId: number;
  network: string;
  deployed: Record<string, string>;
  modules: Record<string, string>;
};

const networkName = process.env.DEPLOY_CHAIN === "arbitrum" ? "arbitrumOne" : "arbitrumSepolia";
const chainId = networkName === "arbitrumOne" ? 42161 : 421614;
const outputPath = networkName === "arbitrumOne" ? "deployments/mainnet.json" : "deployments/sepolia.json";
const resumePath = join("deployments", `${networkName}.resume.json`);

async function main() {
  assertAssetRegistryComplete();
  const hre = await loadHardhatRuntime();
  const state = await loadResumeState();

  console.log(`Deploying Private Onchain Stocks to ${networkName} (${chainId})`);
  console.log(`Asset count: ${assets.length}`);

  await estimateGas(hre, assets);

  state.modules.IdentityRegistryStorage ??= await deployModule(hre, "IdentityRegistryStorage", []);
  state.modules.TrustedIssuersRegistry ??= await deployModule(hre, "TrustedIssuersRegistry", []);
  state.modules.IdentityRegistry ??= await deployModule(hre, "IdentityRegistry", [
    state.modules.IdentityRegistryStorage,
    state.modules.TrustedIssuersRegistry,
  ]);
  state.modules.ComplianceModule ??= await deployModule(hre, "ComplianceModule", [state.modules.IdentityRegistry]);
  state.modules.PriceFeedModule ??= await deployModule(hre, "PriceFeedModule", []);
  state.modules.AssetFactory ??= await deployModule(hre, "AssetFactory", [
    state.modules.IdentityRegistry,
    state.modules.ComplianceModule,
    state.modules.PriceFeedModule,
  ]);
  state.modules.ConfidentialWrapperFactory ??= await deployModule(hre, "ConfidentialWrapperFactory", [
    state.modules.AssetFactory,
  ]);

  await saveResumeState(state);

  for (const asset of assets) {
    if (state.deployed[asset.symbol]) {
      console.log(`Skipping ${asset.symbol}: ${state.deployed[asset.symbol]}`);
      continue;
    }

    const address = await deployAsset(hre, state.modules.AssetFactory, asset);
    state.deployed[asset.symbol] = address;
    await saveResumeState(state);
    console.log(`${asset.symbol}: ${address}`);
  }

  state.modules.GovernanceModule ??= await deployModule(hre, "GovernanceModule", [state.modules.AssetFactory]);
  state.modules.DividendModule ??= await deployModule(hre, "DividendModule", [state.modules.AssetFactory]);
  state.modules.CollateralModule ??= await deployModule(hre, "CollateralModule", [
    state.modules.AssetFactory,
    state.modules.PriceFeedModule,
  ]);

  await saveResumeState(state);
  await writeDeploymentOutput(state);
  await verifyAll(hre, state);
}

async function loadHardhatRuntime() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  try {
    return (await dynamicImport("hardhat")) as {
      ethers: {
        getContractFactory: (name: string) => Promise<{
          deploy: (...args: unknown[]) => Promise<{ waitForDeployment: () => Promise<void>; getAddress: () => Promise<string> }>;
          attach: (address: string) => unknown;
        }>;
      };
      run: (task: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  } catch {
    throw new Error("Hardhat is not installed. Install hardhat and @nomicfoundation/hardhat-toolbox before running this script.");
  }
}

async function estimateGas(_hre: Awaited<ReturnType<typeof loadHardhatRuntime>>, configs: AssetConfig[]) {
  console.log(`Gas estimate step: ${configs.length} assets queued. Run against a fork before mainnet deployment.`);
}

async function deployModule(hre: Awaited<ReturnType<typeof loadHardhatRuntime>>, contractName: string, args: unknown[]) {
  const factory = await hre.ethers.getContractFactory(contractName);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`${contractName}: ${address}`);
  return address;
}

async function deployAsset(
  _hre: Awaited<ReturnType<typeof loadHardhatRuntime>>,
  _factoryAddress: string,
  asset: AssetConfig,
): Promise<string> {
  throw new Error(
    `AssetFactory.deployAsset is not wired yet for ${asset.symbol}. Implement contracts/core/AssetFactory.sol before running this script.`,
  );
}

async function verifyAll(hre: Awaited<ReturnType<typeof loadHardhatRuntime>>, state: ResumeState) {
  for (const [name, address] of Object.entries(state.modules)) {
    await safeVerify(hre, name, address, []);
  }
  for (const [symbol, address] of Object.entries(state.deployed)) {
    await safeVerify(hre, symbol, address, []);
  }
}

async function safeVerify(hre: Awaited<ReturnType<typeof loadHardhatRuntime>>, label: string, address: string, constructorArguments: unknown[]) {
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
