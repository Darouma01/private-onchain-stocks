export enum AssetCategory {
  STOCK_US = "STOCK_US",
  STOCK_INTL = "STOCK_INTL",
  CRYPTO = "CRYPTO",
  COMMODITY = "COMMODITY",
  STABLECOIN = "STABLECOIN",
}

export type HexAddress = `0x${string}`;

export type AssetConfig = {
  name: string;
  symbol: string;
  category: AssetCategory;
  requiresKYC: boolean;
  priceFeed: HexAddress;
  maxHolders: bigint;
  blockedCountries: number[];
  country?: string;
  settlementAssets?: string[];
  complianceNotes: string;
};

export const ZERO_FEED = "0x0000000000000000000000000000000000000000" as const;

export const SANCTIONED_COUNTRIES = [408, 364, 760, 192, 643] as const;
export const US_REG_A_MAX_NON_ACCREDITED = 2000n;
export const UNLIMITED_HOLDERS = 0n;

export const assets: AssetConfig[] = [
  {
    name: "Confidential Apple Stock",
    symbol: "cAAPL",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Tesla Stock",
    symbol: "cTSLA",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Microsoft Stock",
    symbol: "cMSFT",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Alphabet Stock",
    symbol: "cGOOGL",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Amazon Stock",
    symbol: "cAMZN",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential NVIDIA Stock",
    symbol: "cNVDA",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Meta Stock",
    symbol: "cMETA",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Berkshire Hathaway Stock",
    symbol: "cBRK",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential JPMorgan Stock",
    symbol: "cJPM",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Visa Stock",
    symbol: "cV",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Johnson & Johnson Stock",
    symbol: "cJNJ",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Walmart Stock",
    symbol: "cWMT",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential ExxonMobil Stock",
    symbol: "cXOM",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Bank of America Stock",
    symbol: "cBAC",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Netflix Stock",
    symbol: "cNFLX",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Disney Stock",
    symbol: "cDIS",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Pfizer Stock",
    symbol: "cPFE",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Coca-Cola Stock",
    symbol: "cKO",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential McDonald's Stock",
    symbol: "cMCD",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  {
    name: "Confidential Goldman Sachs Stock",
    symbol: "cGS",
    category: AssetCategory.STOCK_US,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: US_REG_A_MAX_NON_ACCREDITED,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country: "US",
    complianceNotes: "US stock. KYC, accredited-investor tiering, and Reg A+ holder limits apply.",
  },
  ...[
    ["Confidential SAP SE Stock", "cSAP", "DE", "Germany"],
    ["Confidential ASML Stock", "cASML", "NL", "Netherlands"],
    ["Confidential Novo Nordisk Stock", "cNVO", "DK", "Denmark"],
    ["Confidential Shell Stock", "cSHELL", "GB", "United Kingdom"],
    ["Confidential HSBC Stock", "cHSBC", "GB", "United Kingdom"],
    ["Confidential Toyota Stock", "cTOYOTA", "JP", "Japan"],
    ["Confidential Sony Stock", "cSONY", "JP", "Japan"],
    ["Confidential Samsung Stock", "cSAMSUNG", "KR", "South Korea"],
    ["Confidential Alibaba Stock", "cALIBABA", "HK", "China/Hong Kong additional restrictions"],
    ["Confidential Tencent Stock", "cTENCENT", "HK", "China/Hong Kong additional restrictions"],
    ["Confidential Nestle Stock", "cNESTLE", "CH", "Switzerland"],
    ["Confidential LVMH Stock", "cLVMH", "FR", "France"],
    ["Confidential Siemens Stock", "cSIEMENS", "DE", "Germany"],
    ["Confidential Rio Tinto Stock", "cRIOTINTO", "AU", "Australia/United Kingdom"],
    ["Confidential Reliance Industries Stock", "cRELIANCE", "IN", "India FEMA compliance flag"],
  ].map(([name, symbol, country, note]) => ({
    name,
    symbol,
    category: AssetCategory.STOCK_INTL,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: 5000n,
    blockedCountries: [...SANCTIONED_COUNTRIES],
    country,
    complianceNotes: `International stock. KYC and country-specific controls apply. ${note}.`,
  })),
  ...[
    ["Confidential Bitcoin", "cBTC"],
    ["Confidential Ethereum", "cETH"],
    ["Confidential BNB", "cBNB"],
    ["Confidential Solana", "cSOL"],
    ["Confidential Ripple", "cXRP"],
    ["Confidential Cardano", "cADA"],
    ["Confidential Avalanche", "cAVAX"],
    ["Confidential Polkadot", "cDOT"],
    ["Confidential Chainlink", "cLINK"],
    ["Confidential Polygon", "cMATIC"],
  ].map(([name, symbol]) => ({
    name,
    symbol,
    category: AssetCategory.CRYPTO,
    requiresKYC: false,
    priceFeed: ZERO_FEED,
    maxHolders: UNLIMITED_HOLDERS,
    blockedCountries: [],
    complianceNotes: "Crypto asset. Open transfers, no KYC, no holder cap.",
  })),
  ...[
    ["Confidential Gold", "cGOLD"],
    ["Confidential Silver", "cSILVER"],
    ["Confidential Crude Oil WTI", "cOIL"],
    ["Confidential Brent Crude", "cBRENT"],
    ["Confidential Natural Gas", "cNATGAS"],
    ["Confidential Copper", "cCOPPER"],
    ["Confidential Platinum", "cPLATINUM"],
    ["Confidential Wheat", "cWHEAT"],
    ["Confidential Corn", "cCORN"],
    ["Confidential Coffee", "cCOFFEE"],
  ].map(([name, symbol]) => ({
    name,
    symbol,
    category: AssetCategory.COMMODITY,
    requiresKYC: true,
    priceFeed: ZERO_FEED,
    maxHolders: 10000n,
    blockedCountries: [],
    settlementAssets: ["cUSDC", "cUSDT"],
    complianceNotes: "Commodity asset. Light KYC and preferred settlement in cUSDC or cUSDT.",
  })),
  ...[
    ["Confidential USD Coin", "cUSDC", "USD stablecoin. Used as primary settlement currency."],
    ["Confidential Tether", "cUSDT", "USD stablecoin. Used as settlement currency."],
    ["Confidential DAI", "cDAI", "USD stablecoin. Used as decentralized settlement currency."],
    ["Confidential Euro Coin", "cEURC", "EUR stablecoin. EU jurisdiction preferred."],
    ["Confidential GBP Tether", "cGBPT", "GBP stablecoin. UK jurisdiction preferred."],
    ["Confidential Tether Gold", "cXAUT", "XAU-backed stable asset. Peg check required."],
  ].map(([name, symbol, complianceNotes]) => ({
    name,
    symbol,
    category: AssetCategory.STABLECOIN,
    requiresKYC: false,
    priceFeed: ZERO_FEED,
    maxHolders: UNLIMITED_HOLDERS,
    blockedCountries: [],
    complianceNotes: `${complianceNotes} Mint requires peg validation.`,
  })),
];

export function getAssetsByCategory(category: AssetCategory) {
  return assets.filter((asset) => asset.category === category);
}

export function assertAssetRegistryComplete() {
  const symbols = new Set<string>();
  for (const asset of assets) {
    if (symbols.has(asset.symbol)) {
      throw new Error(`Duplicate asset symbol: ${asset.symbol}`);
    }
    symbols.add(asset.symbol);
  }
  if (assets.length !== 61) {
    throw new Error(`Expected 61 assets, found ${assets.length}`);
  }
}
