import { AssetCategory } from "@/deploy/assets.config";

type UtilityAsset = {
  category: AssetCategory;
  name: string;
  symbol: string;
};

export type UtilityTextMap = {
  accessControl: string;
  assistantLocked: string;
  auditorLocked: string;
  auditorTitle: string;
  collateral: string;
  connectDescription: string;
  connectPrompt: string;
  encryptedBalanceLabel: string;
  governance: string;
  insightsLocked: string;
  insightsTitle: string;
  kycPrompt: string;
  privatePayments: string;
  rewards: string;
  sectionDescription: string;
  vipButtonText: string;
  vipDescription: string;
  vipThreshold: string;
  vipTitle: string;
};

export function getUtilityText(asset: UtilityAsset): UtilityTextMap {
  const sym = asset.symbol;
  const confidentialSym = sym;
  const cat = asset.category;
  const vipThreshold = getVIPThreshold(asset);

  return {
    sectionDescription: `${sym} is the active confidential asset for private payments, holder access, rewards, governance, and collateral.`,
    connectPrompt: `Connect wallet to use ${sym}`,
    connectDescription: `After connecting, you can approve, wrap, and privately transfer ${asset.name}.`,
    kycPrompt: `Connect your wallet to check whether it is approved for ${sym}.`,
    privatePayments: {
      [AssetCategory.STOCK_US]: `Confidential ${sym} transfers settle equity trades between verified investors while on-chain amounts remain encrypted.`,
      [AssetCategory.STOCK_INTL]: `Confidential ${sym} transfers settle international equity trades with hidden amounts and full regulatory compliance.`,
      [AssetCategory.CRYPTO]: `Transfer ${confidentialSym} privately between wallets — transaction amounts never appear in plaintext on-chain.`,
      [AssetCategory.COMMODITY]: `Settle ${sym} commodity positions confidentially with hidden transfer amounts on-chain.`,
      [AssetCategory.STABLECOIN]: `Send ${sym} payments privately — ideal for confidential payroll, OTC settlement, and private fund transfers.`,
    }[cat],
    accessControl: {
      [AssetCategory.STOCK_US]: `Hold ${confidentialSym} to unlock institutional investor tools, private data rooms, and tier-gated analytics.`,
      [AssetCategory.STOCK_INTL]: `Hold ${confidentialSym} to access international investor features, private data rooms, and compliance-gated analytics.`,
      [AssetCategory.CRYPTO]: `Hold ${confidentialSym} to access advanced trading features, private alpha channels, and tier-gated protocol insights.`,
      [AssetCategory.COMMODITY]: `Hold ${confidentialSym} to access commodity market intelligence, private OTC desk, and institutional pricing.`,
      [AssetCategory.STABLECOIN]: `Hold ${confidentialSym} to access yield optimization tools, private lending rates, and treasury management features.`,
    }[cat],
    rewards: {
      [AssetCategory.STOCK_US]: `Earn confidential ${sym} dividends distributed as encrypted amounts — only you can decrypt and reveal what you received.`,
      [AssetCategory.STOCK_INTL]: `Earn confidential ${sym} dividends as encrypted amounts — your distribution is private and only visible to you.`,
      [AssetCategory.CRYPTO]: `Earn confidential staking rewards on ${confidentialSym} — reward amounts stay private until you choose to reveal them.`,
      [AssetCategory.COMMODITY]: `Earn confidential yield on ${sym} positions — settlement amounts encrypted and private to each holder.`,
      [AssetCategory.STABLECOIN]: `Earn confidential yield on ${confidentialSym} — interest distributions are encrypted and private to each holder.`,
    }[cat],
    governance: {
      [AssetCategory.STOCK_US]: `Vote on ${sym} protocol decisions — fee changes, new listings, and compliance rules — using your confidential holdings as private voting weight.`,
      [AssetCategory.STOCK_INTL]: `Participate in ${sym} governance with private votes on compliance rules, listing parameters, and cross-border trading policies.`,
      [AssetCategory.CRYPTO]: `Participate in ${confidentialSym} protocol governance with private votes. Your voting weight and direction are never revealed until proposal closes.`,
      [AssetCategory.COMMODITY]: `Shape ${sym} market parameters through confidential governance — vote on settlement rules and oracle configurations.`,
      [AssetCategory.STABLECOIN]: `Vote on ${sym} peg mechanisms, yield strategies, and treasury decisions with confidential voting weight.`,
    }[cat],
    collateral: {
      [AssetCategory.STOCK_US]: `Use ${confidentialSym} as confidential collateral to borrow stablecoins privately — your collateral amount is never exposed on-chain.`,
      [AssetCategory.STOCK_INTL]: `Lock ${confidentialSym} as private collateral for borrowing stablecoins — your position size stays confidential while remaining DeFi composable.`,
      [AssetCategory.CRYPTO]: `Lock ${confidentialSym} as private collateral for borrowing — your position size stays confidential while remaining fully DeFi composable.`,
      [AssetCategory.COMMODITY]: `Use ${sym} as confidential commodity collateral — borrow against your position without revealing your exposure size.`,
      [AssetCategory.STABLECOIN]: `Use ${confidentialSym} as the settlement and borrowing currency across the protocol — preferred collateral for private loans.`,
    }[cat],
    vipTitle: `Private ${sym} VIP Tier`,
    vipDescription: `Reveal your ${confidentialSym} balance only to this wallet session to check the ${vipThreshold} ${confidentialSym} VIP threshold. The public dashboard never displays another investor's confidential balance.`,
    vipButtonText: `Check ${sym} VIP Tier`,
    encryptedBalanceLabel: `Encrypted ${confidentialSym} balance handle`,
    insightsTitle: `${sym} On-Chain Insights`,
    insightsLocked: `Connect a verified wallet and wrap ${sym} into confidential ${sym} to unlock ${sym} insights.`,
    auditorTitle: `${sym} Contract Auditor`,
    auditorLocked: `Connect a verified wallet and wrap ${sym} to unlock the ${sym} contract auditor.`,
    assistantLocked: `Connect a verified wallet and wrap ${sym} to unlock the AI assistant for ${asset.name}.`,
    vipThreshold,
  };
}

export function getVIPThreshold(asset: UtilityAsset): string {
  if (asset.category === AssetCategory.CRYPTO) {
    return asset.symbol === "cBTC" || asset.symbol === "cETH" ? "0.1" : "100";
  }
  if (asset.category === AssetCategory.STABLECOIN) return "1,000";
  if (asset.category === AssetCategory.COMMODITY) {
    return asset.symbol === "cGOLD" || asset.symbol === "cSILVER" ? "10" : "50";
  }
  return "50";
}
