import { readFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import solc from "solc";
import { encodeAbiParameters, type Address } from "viem";

type DeploymentFile = {
  chainId: number;
  deployer: Address;
  addresses: Record<string, Address>;
};

type VerifyTarget = {
  sourcePath: string;
  contractName: string;
  address: Address;
  constructorArgs: `0x${string}`;
};

const chainId = Number(process.env.CHAIN_ID ?? "421614");
const apiKey = requiredEnv("ARBISCAN_API_KEY");
const deployment = JSON.parse(await readFile(join("deployments", String(chainId), "addresses.json"), "utf8")) as DeploymentFile;
const endpoint = `https://api.etherscan.io/v2/api?chainid=${chainId}`;
const maxBalancePerInvestor = process.env.MAX_BALANCE_PER_INVESTOR
  ? BigInt(process.env.MAX_BALANCE_PER_INVESTOR)
  : 1_000_000_000_000_000_000_000_000n;
const maxHolders = process.env.MAX_HOLDERS ? BigInt(process.env.MAX_HOLDERS) : 1000n;

const targets: VerifyTarget[] = [
  {
    sourcePath: "contracts/src/DemoInfrastructure.sol",
    contractName: "DemoClaimIssuer",
    address: deployment.addresses.DemoClaimIssuer,
    constructorArgs: "0x",
  },
  {
    sourcePath: "contracts/src/CAAPL3643Suite.sol",
    contractName: "CAAPLClaimTopicsRegistry",
    address: deployment.addresses.CAAPLClaimTopicsRegistry,
    constructorArgs: encode(["address"], [deployment.deployer]),
  },
  {
    sourcePath: "contracts/src/CAAPL3643Suite.sol",
    contractName: "CAAPLTrustedIssuersRegistry",
    address: deployment.addresses.CAAPLTrustedIssuersRegistry,
    constructorArgs: encode(["address"], [deployment.deployer]),
  },
  {
    sourcePath: "contracts/src/CAAPL3643Suite.sol",
    contractName: "CAAPLIdentityRegistryStorage",
    address: deployment.addresses.CAAPLIdentityRegistryStorage,
    constructorArgs: encode(["address"], [deployment.deployer]),
  },
  {
    sourcePath: "contracts/src/CAAPL3643Suite.sol",
    contractName: "CAAPLIdentityRegistry",
    address: deployment.addresses.CAAPLIdentityRegistry,
    constructorArgs: encode(
      ["address", "address", "address", "address"],
      [
        deployment.deployer,
        deployment.addresses.CAAPLTrustedIssuersRegistry,
        deployment.addresses.CAAPLClaimTopicsRegistry,
        deployment.addresses.CAAPLIdentityRegistryStorage,
      ],
    ),
  },
  {
    sourcePath: "contracts/src/CAAPL3643Suite.sol",
    contractName: "CAAPLCompliance",
    address: deployment.addresses.CAAPLCompliance,
    constructorArgs: encode(
      ["address", "address", "uint256", "uint256"],
      [deployment.deployer, deployment.addresses.CAAPLIdentityRegistry, maxBalancePerInvestor, maxHolders],
    ),
  },
  {
    sourcePath: "contracts/src/CAAPL3643Suite.sol",
    contractName: "CAAPLToken",
    address: deployment.addresses.CAAPLToken,
    constructorArgs: encode(
      ["address", "address", "address"],
      [deployment.deployer, deployment.addresses.CAAPLIdentityRegistry, deployment.addresses.CAAPLCompliance],
    ),
  },
  {
    sourcePath: "contracts/src/DemoInfrastructure.sol",
    contractName: "DemoNoxConfidentialExecutor",
    address: deployment.addresses.DemoNoxConfidentialExecutor,
    constructorArgs: "0x",
  },
  {
    sourcePath: "contracts/src/ConfidentialCAAPLToken.sol",
    contractName: "ConfidentialCAAPLToken",
    address: deployment.addresses.ConfidentialCAAPLToken,
    constructorArgs: encode(
      ["address", "address", "string"],
      [deployment.addresses.CAAPLToken, deployment.addresses.DemoNoxConfidentialExecutor, "ipfs://confidential-caapl"],
    ),
  },
];

async function main() {
  const compilerVersion = await getCompilerVersion();
  const sourceCode = JSON.stringify({
    language: "Solidity",
    sources: await collectSources(["contracts/src/CAAPL3643Suite.sol", "contracts/src/ConfidentialCAAPLToken.sol", "contracts/src/DemoInfrastructure.sol"]),
    settings: {
      optimizer: { enabled: false, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
        },
      },
    },
  });

  for (const target of targets) {
    console.log(`Submitting ${target.contractName} at ${target.address}`);
    const guid = await submitVerification(target, sourceCode, compilerVersion);
    console.log(`${target.contractName} guid: ${guid}`);
    await waitForVerification(guid);
  }
}

async function submitVerification(target: VerifyTarget, sourceCode: string, compilerVersion: string) {
  const body = new URLSearchParams({
    apikey: apiKey,
    module: "contract",
    action: "verifysourcecode",
    contractaddress: target.address,
    sourceCode,
    codeformat: "solidity-standard-json-input",
    contractname: `${target.sourcePath}:${target.contractName}`,
    compilerversion: compilerVersion,
    optimizationUsed: "0",
    runs: "200",
    constructorArguments: target.constructorArgs.slice(2),
    licenseType: "3",
  });

  const response = await fetch(endpoint, { method: "POST", body });
  const payload = (await response.json()) as { status: string; message: string; result: string };
  if (payload.status !== "1") {
    if (/already verified/i.test(payload.result)) {
      console.log(`${target.contractName} is already verified`);
      return "";
    }
    throw new Error(`${target.contractName} verification submit failed: ${payload.message} ${payload.result}`);
  }
  return payload.result;
}

async function waitForVerification(guid: string) {
  if (!guid) {
    return;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    const url = new URL(endpoint);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("module", "contract");
    url.searchParams.set("action", "checkverifystatus");
    url.searchParams.set("guid", guid);

    const response = await fetch(url);
    const payload = (await response.json()) as { status: string; message: string; result: string };
    console.log(`Verification status: ${payload.result}`);
    if (payload.status === "1") {
      return;
    }
    if (!/pending/i.test(payload.result)) {
      throw new Error(`Verification failed: ${payload.message} ${payload.result}`);
    }
  }

  throw new Error("Verification timed out");
}

async function collectSources(entrypoints: string[]) {
  const sources: Record<string, { content: string }> = {};

  async function visit(sourceName: string, filePath = sourceName) {
    const normalizedSourceName = normalize(sourceName).replaceAll("\\", "/");
    const normalizedFilePath = normalize(filePath).replaceAll("\\", "/");
    if (sources[normalizedSourceName]) {
      return;
    }

    const content = await readFile(normalizedFilePath, "utf8");
    sources[normalizedSourceName] = { content };

    for (const importPath of parseImports(content)) {
      const resolved = resolveImport(normalizedSourceName, importPath);
      await visit(resolved.sourceName, resolved.filePath);
    }
  }

  for (const entrypoint of entrypoints) {
    await visit(entrypoint);
  }

  return sources;
}

function parseImports(content: string) {
  return [...content.matchAll(/import\s+(?:[^"']+from\s+)?["']([^"']+)["'];/g)].map((match) => match[1]);
}

function resolveImport(fromPath: string, importPath: string) {
  if (importPath.startsWith("@openzeppelin/")) {
    return {
      sourceName: importPath,
      filePath: join("node_modules", importPath).replaceAll("\\", "/"),
    };
  }
  if (importPath.startsWith(".")) {
    const sourceName = normalize(join(dirname(fromPath), importPath)).replaceAll("\\", "/");
    return {
      sourceName,
      filePath: sourceName.startsWith("@openzeppelin/") ? join("node_modules", sourceName).replaceAll("\\", "/") : sourceName,
    };
  }
  return { sourceName: importPath, filePath: importPath };
}

async function getCompilerVersion() {
  return `v${solc.version().replace(".Emscripten.clang", "")}`;
}

function encode(types: string[], values: unknown[]) {
  return encodeAbiParameters(
    types.map((type) => ({ type })),
    values,
  );
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
