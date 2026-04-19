import type { AssetPrice } from "@/lib/prices/priceService";

export const FALLBACK_PRICE_TIMESTAMP = Date.UTC(2026, 3, 19, 0, 0, 0);

export const LAST_KNOWN_PRICES: Record<string, { change24h: number; price: number }> = {
  cAAPL: { price: 169.89, change24h: 0.42 },
  cTSLA: { price: 247.3, change24h: -0.84 },
  cMSFT: { price: 378.8, change24h: 0.31 },
  cGOOGL: { price: 154.64, change24h: 0.27 },
  cAMZN: { price: 182.12, change24h: 0.38 },
  cNVDA: { price: 112.92, change24h: 1.14 },
  cMETA: { price: 502.34, change24h: 0.66 },
  cBRK: { price: 414.5, change24h: 0.18 },
  cJPM: { price: 198.74, change24h: -0.22 },
  cV: { price: 278.55, change24h: 0.29 },
  cJNJ: { price: 151.22, change24h: -0.12 },
  cWMT: { price: 68.36, change24h: 0.21 },
  cXOM: { price: 118.9, change24h: 0.47 },
  cBAC: { price: 37.84, change24h: -0.18 },
  cNFLX: { price: 628.41, change24h: 0.73 },
  cDIS: { price: 112.74, change24h: 0.35 },
  cPFE: { price: 27.56, change24h: -0.09 },
  cKO: { price: 61.34, change24h: 0.16 },
  cMCD: { price: 286.7, change24h: -0.24 },
  cGS: { price: 458.21, change24h: 0.52 },
  cSAP: { price: 204.3, change24h: 0.44 },
  cASML: { price: 917.6, change24h: 0.58 },
  cNVO: { price: 126.8, change24h: -0.36 },
  cSHELL: { price: 72.44, change24h: 0.22 },
  cHSBC: { price: 43.92, change24h: 0.15 },
  cTOYOTA: { price: 230.5, change24h: 0.28 },
  cSONY: { price: 86.18, change24h: -0.17 },
  cSAMSUNG: { price: 52.4, change24h: 0.33 },
  cALIBABA: { price: 73.9, change24h: -0.41 },
  cTENCENT: { price: 39.65, change24h: 0.26 },
  cNESTLE: { price: 108.2, change24h: 0.11 },
  cLVMH: { price: 768.5, change24h: -0.29 },
  cSIEMENS: { price: 188.75, change24h: 0.39 },
  cRIOTINTO: { price: 66.42, change24h: 0.48 },
  cRELIANCE: { price: 35.1, change24h: 0.24 },
  cBTC: { price: 67420, change24h: 1.12 },
  cETH: { price: 3180, change24h: 0.86 },
  cBNB: { price: 590.4, change24h: 0.47 },
  cSOL: { price: 142.6, change24h: 1.36 },
  cXRP: { price: 0.62, change24h: -0.38 },
  cADA: { price: 0.47, change24h: 0.42 },
  cAVAX: { price: 35.8, change24h: 0.75 },
  cDOT: { price: 6.84, change24h: -0.2 },
  cLINK: { price: 15.2, change24h: 0.51 },
  cMATIC: { price: 0.72, change24h: 0.18 },
  cGOLD: { price: 2348, change24h: 0.28 },
  cSILVER: { price: 27.35, change24h: 0.34 },
  cOIL: { price: 82.2, change24h: -0.22 },
  cBRENT: { price: 86.1, change24h: -0.18 },
  cNATGAS: { price: 2.12, change24h: 0.41 },
  cCOPPER: { price: 4.54, change24h: 0.36 },
  cPLATINUM: { price: 965, change24h: 0.19 },
  cWHEAT: { price: 5.72, change24h: -0.13 },
  cCORN: { price: 4.48, change24h: 0.08 },
  cCOFFEE: { price: 2.21, change24h: 0.24 },
  cUSDC: { price: 1, change24h: 0 },
  cUSDT: { price: 1, change24h: 0 },
  cDAI: { price: 1, change24h: 0 },
  cEURC: { price: 1.08, change24h: 0.02 },
  cGBPT: { price: 1.25, change24h: -0.03 },
  cXAUT: { price: 2348, change24h: 0.28 },
};

export function fallbackAssetPrice(symbol: string): AssetPrice {
  const quote = LAST_KNOWN_PRICES[symbol] ?? { price: 1, change24h: 0 };
  return {
    symbol,
    price: quote.price,
    change24h: quote.change24h,
    source: "last-known",
    lastUpdated: FALLBACK_PRICE_TIMESTAMP,
  };
}

export function fallbackPriceMap(symbols = Object.keys(LAST_KNOWN_PRICES)): Record<string, AssetPrice> {
  return Object.fromEntries(symbols.map((symbol) => [symbol, fallbackAssetPrice(symbol)]));
}
