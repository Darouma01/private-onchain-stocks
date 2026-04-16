import deployment from "@/deployments/421614/asset-addresses.json";
import { assets, AssetCategory } from "@/deploy/assets.config";

export type DeployedAsset = {
  name: string;
  symbol: string;
  category: AssetCategory;
  requiresKYC: boolean;
  country?: string;
  complianceNotes: string;
  baseAddress: `0x${string}`;
  wrapperAddress: `0x${string}`;
};

export const assetDeployment = deployment;

export const deployedAssets: DeployedAsset[] = assets.map((asset) => ({
  name: asset.name,
  symbol: asset.symbol,
  category: asset.category,
  requiresKYC: asset.requiresKYC,
  country: asset.country,
  complianceNotes: asset.complianceNotes,
  baseAddress: deployment.assets[asset.symbol as keyof typeof deployment.assets] as `0x${string}`,
  wrapperAddress: deployment.wrappers[asset.symbol as keyof typeof deployment.wrappers] as `0x${string}`,
}));

export const deployedAssetCategories = [
  AssetCategory.STOCK_US,
  AssetCategory.STOCK_INTL,
  AssetCategory.CRYPTO,
  AssetCategory.COMMODITY,
  AssetCategory.STABLECOIN,
] as const;

export const categoryLabels: Record<AssetCategory, string> = {
  [AssetCategory.STOCK_US]: "US Stocks",
  [AssetCategory.STOCK_INTL]: "International",
  [AssetCategory.CRYPTO]: "Crypto",
  [AssetCategory.COMMODITY]: "Commodities",
  [AssetCategory.STABLECOIN]: "Stablecoins",
};

export const moduleAddresses = deployment.modules;

export function deployedAssetBySymbol(symbol: string) {
  return deployedAssets.find((asset) => asset.symbol === symbol);
}
