import { NextResponse } from "next/server";
import { deployedAssets } from "@/lib/deployed-assets";
import { fetchAllPrices } from "@/lib/prices/priceService";

const sparklineRevalidate = 3600;

export const dynamic = "force-dynamic";

type SparklinePayload = {
  prices: number[];
  symbol: string;
};

const cryptoIds: Record<string, string> = {
  cBTC: "bitcoin",
  cETH: "ethereum",
  cBNB: "binancecoin",
  cSOL: "solana",
  cXRP: "ripple",
  cADA: "cardano",
  cAVAX: "avalanche-2",
  cDOT: "polkadot",
  cLINK: "chainlink",
  cMATIC: "matic-network",
};

const cryptoFallbackIds: Record<string, string> = {
  cMATIC: "polygon-ecosystem-token",
};

const stablecoinIds: Record<string, string> = {
  cEURC: "euro-coin",
  cGBPT: "tether-gbp",
  cXAUT: "tether-gold",
};

const stablecoinYahooFallbacks: Record<string, string> = {
  cEURC: "EURUSD=X",
  cGBPT: "GBPUSD=X",
  cXAUT: "GC=F",
};

const yahooSymbols: Record<string, string> = {
  cAAPL: "AAPL",
  cTSLA: "TSLA",
  cMSFT: "MSFT",
  cGOOGL: "GOOGL",
  cAMZN: "AMZN",
  cNVDA: "NVDA",
  cMETA: "META",
  cBRK: "BRK-B",
  cJPM: "JPM",
  cV: "V",
  cJNJ: "JNJ",
  cWMT: "WMT",
  cXOM: "XOM",
  cBAC: "BAC",
  cNFLX: "NFLX",
  cDIS: "DIS",
  cPFE: "PFE",
  cKO: "KO",
  cMCD: "MCD",
  cGS: "GS",
  cSAP: "SAP",
  cASML: "ASML",
  cNVO: "NVO",
  cSHELL: "SHEL",
  cHSBC: "HSBC",
  cTOYOTA: "TM",
  cSONY: "SONY",
  cSAMSUNG: "005930.KS",
  cALIBABA: "BABA",
  cTENCENT: "0700.HK",
  cNESTLE: "NESN.SW",
  cLVMH: "MC.PA",
  cSIEMENS: "SIE.DE",
  cRIOTINTO: "RIO",
  cRELIANCE: "RELIANCE.NS",
  cGOLD: "GC=F",
  cSILVER: "SI=F",
  cOIL: "CL=F",
  cBRENT: "BZ=F",
  cNATGAS: "NG=F",
  cCOPPER: "HG=F",
  cPLATINUM: "PL=F",
  cWHEAT: "ZW=F",
  cCORN: "ZC=F",
  cCOFFEE: "KC=F",
};

export async function GET() {
  const settled = await Promise.allSettled(deployedAssets.map((asset) => fetchSparkline(asset.symbol)));
  const sparklines: Record<string, SparklinePayload> = {};

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sparklines[result.value.symbol] = result.value;
    } else {
      const symbol = deployedAssets[index]?.symbol;
      if (symbol) sparklines[symbol] = { symbol, prices: [] };
    }
  });

  const missingSymbols = deployedAssets
    .map((asset) => asset.symbol)
    .filter((symbol) => (sparklines[symbol]?.prices.length ?? 0) === 0);
  if (missingSymbols.length > 0) {
    try {
      const currentPrices = await fetchAllPrices();
      for (const symbol of missingSymbols) {
        const price = currentPrices[symbol]?.price;
        if (typeof price === "number" && Number.isFinite(price) && price > 0) {
          sparklines[symbol] = { symbol, prices: Array.from({ length: 7 }, () => price) };
        }
      }
    } catch {
      // The frontend still draws a flat line from the shared live price cache when history is unavailable.
    }
  }

  return NextResponse.json(
    {
      lastRefresh: new Date().toISOString(),
      sparklines,
    },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${sparklineRevalidate}, stale-while-revalidate=86400`,
      },
    },
  );
}

async function fetchSparkline(symbol: string): Promise<SparklinePayload> {
  if (symbol === "cUSDC" || symbol === "cUSDT" || symbol === "cDAI") {
    return { symbol, prices: Array.from({ length: 7 }, () => 1) };
  }

  const coinGeckoId = cryptoIds[symbol] ?? stablecoinIds[symbol];
  if (coinGeckoId) {
    const prices = await fetchCoinGeckoSparkline(coinGeckoId);
    const cryptoFallbackId = cryptoFallbackIds[symbol];
    if (prices.length === 0 && cryptoFallbackId) {
      return { symbol, prices: await fetchCoinGeckoSparkline(cryptoFallbackId) };
    }
    const fallbackTicker = stablecoinYahooFallbacks[symbol];
    return {
      symbol,
      prices: prices.length > 0 || !fallbackTicker ? prices : await fetchYahooSparkline(fallbackTicker),
    };
  }

  const yahooSymbol = yahooSymbols[symbol];
  if (yahooSymbol) {
    return { symbol, prices: await fetchYahooSparkline(yahooSymbol) };
  }

  return { symbol, prices: [] };
}

async function fetchCoinGeckoSparkline(id: string) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7&interval=daily`;
  const response = await fetch(url, { next: { revalidate: sparklineRevalidate } });
  if (!response.ok) return fetchCoinGeckoFlatPrice(id);

  const payload = (await response.json()) as { prices?: Array<[number, number]> };
  const prices = normalizePrices((payload.prices ?? []).map(([, price]) => price));
  return prices.length > 0 ? prices : fetchCoinGeckoFlatPrice(id);
}

async function fetchCoinGeckoFlatPrice(id: string) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
  const response = await fetch(url, { next: { revalidate: sparklineRevalidate } });
  if (!response.ok) return [];

  const payload = (await response.json()) as Record<string, { usd?: number }>;
  const price = payload[id]?.usd;
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? Array.from({ length: 7 }, () => price) : [];
}

async function fetchYahooSparkline(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=7d`;
  const response = await fetch(url, { next: { revalidate: sparklineRevalidate } });
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    chart?: {
      result?: Array<{
        indicators?: {
          quote?: Array<{
            close?: Array<number | null>;
          }>;
        };
      }>;
    };
  };
  const closes = payload.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  return normalizePrices(closes.filter((value): value is number => typeof value === "number" && Number.isFinite(value)));
}

function normalizePrices(values: number[]) {
  const prices = values.filter((value) => Number.isFinite(value) && value > 0).slice(-7);
  if (prices.length === 0) return [];
  while (prices.length < 7) prices.unshift(prices[0]);
  return prices;
}
