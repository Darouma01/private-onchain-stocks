export interface AssetPrice {
  symbol: string;
  price: number;
  change24h: number;
  source: "coingecko" | "yahoo" | "stooq";
  lastUpdated: number;
}

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

const stablecoinIds: Record<string, string> = {
  cEURC: "euro-coin",
  cGBPT: "tether-gbp",
  cXAUT: "tether-gold",
};

const coingeckoFallbackIds: Record<string, string> = {
  cMATIC: "polygon-ecosystem-token",
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
};

const commoditySymbols: Record<string, string> = {
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

const stooqFallbackSymbols: Record<string, string> = {
  cAAPL: "aapl.us",
  cTSLA: "tsla.us",
  cMSFT: "msft.us",
  cGOOGL: "googl.us",
  cAMZN: "amzn.us",
  cNVDA: "nvda.us",
  cMETA: "meta.us",
  cBRK: "brk.b.us",
  cJPM: "jpm.us",
  cV: "v.us",
  cJNJ: "jnj.us",
  cWMT: "wmt.us",
  cXOM: "xom.us",
  cBAC: "bac.us",
  cNFLX: "nflx.us",
  cDIS: "dis.us",
  cPFE: "pfe.us",
  cKO: "ko.us",
  cMCD: "mcd.us",
  cGS: "gs.us",
  cSAP: "sap.us",
  cASML: "asml.us",
  cNVO: "nvo.us",
  cSHELL: "shel.us",
  cHSBC: "hsbc.us",
  cTOYOTA: "tm.us",
  cSONY: "sony.us",
  cSAMSUNG: "005930.kr",
  cALIBABA: "baba.us",
  cTENCENT: "0700.hk",
  cNESTLE: "nesn.ch",
  cLVMH: "mc.fr",
  cSIEMENS: "sie.de",
  cRIOTINTO: "rio.us",
  cRELIANCE: "reliance.in",
  cGOLD: "xauusd",
  cSILVER: "xagusd",
  cOIL: "cl.f",
  cBRENT: "brent.f",
  cNATGAS: "ng.f",
  cCOPPER: "hg.f",
  cPLATINUM: "pl.f",
  cWHEAT: "zw.f",
  cCORN: "zc.f",
  cCOFFEE: "kc.f",
  cGBPT: "gbpusd",
};

export async function fetchCryptoPrices(): Promise<Record<string, AssetPrice>> {
  return fetchCoinGeckoPrices(cryptoIds, coingeckoFallbackIds);
}

export async function fetchStablecoinPrices(): Promise<Record<string, AssetPrice>> {
  const now = Date.now();
  const fetched = await fetchCoinGeckoPrices(stablecoinIds);
  if (!fetched.cGBPT) {
    const gbp = await fetchStooqPrice("cGBPT");
    if (gbp) fetched.cGBPT = gbp;
  }

  return {
    cUSDC: { symbol: "cUSDC", price: 1, change24h: 0, source: "coingecko", lastUpdated: now },
    cUSDT: { symbol: "cUSDT", price: 1, change24h: 0, source: "coingecko", lastUpdated: now },
    cDAI: { symbol: "cDAI", price: 1, change24h: 0, source: "coingecko", lastUpdated: now },
    ...fetched,
  };
}

export async function fetchStockPrices(symbols = Object.keys(yahooSymbols)): Promise<Record<string, AssetPrice>> {
  return fetchYahooPrices(symbols, yahooSymbols);
}

export async function fetchCommodityPrices(symbols = Object.keys(commoditySymbols)): Promise<Record<string, AssetPrice>> {
  return fetchYahooPrices(symbols, commoditySymbols);
}

export async function fetchAllPrices(): Promise<Record<string, AssetPrice>> {
  const [crypto, stablecoins, stocks, commodities] = await Promise.all([
    fetchCryptoPrices(),
    fetchStablecoinPrices(),
    fetchStockPrices(),
    fetchCommodityPrices(),
  ]);

  const prices = {
    ...stocks,
    ...commodities,
    ...crypto,
    ...stablecoins,
  };

  if (prices.cGOLD) {
    prices.cXAUT = {
      ...prices.cGOLD,
      symbol: "cXAUT",
      source: prices.cGOLD.source,
    };
  }

  return prices;
}

async function fetchCoinGeckoPrices(mapping: Record<string, string>, fallbackMapping: Record<string, string> = {}) {
  const ids = Object.values(mapping).join(",");
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 60 } },
  );
  if (!response.ok) throw new Error(`CoinGecko price fetch failed: ${response.status}`);

  const payload = (await response.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
  const now = Date.now();
  const result: Record<string, AssetPrice> = {};

  for (const [symbol, id] of Object.entries(mapping)) {
    const price = payload[id]?.usd;
    if (typeof price !== "number") continue;
    result[symbol] = {
      symbol,
      price,
      change24h: payload[id]?.usd_24h_change ?? 0,
      source: "coingecko",
      lastUpdated: now,
    };
  }

  const missingFallbacks = Object.entries(fallbackMapping).filter(([symbol]) => !result[symbol]);
  if (missingFallbacks.length) {
    const fallbackIds = missingFallbacks.map(([, id]) => id).join(",");
    const fallbackResponse = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${fallbackIds}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 60 } },
    );
    if (fallbackResponse.ok) {
      const fallbackPayload = (await fallbackResponse.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
      for (const [symbol, id] of missingFallbacks) {
        const price = fallbackPayload[id]?.usd;
        if (typeof price !== "number") continue;
        result[symbol] = {
          symbol,
          price,
          change24h: fallbackPayload[id]?.usd_24h_change ?? 0,
          source: "coingecko",
          lastUpdated: now,
        };
      }
    }
  }

  return result;
}

async function fetchYahooPrices(symbols: string[], mapping: Record<string, string>) {
  const entries = symbols.filter((symbol) => mapping[symbol]).map((symbol) => [symbol, mapping[symbol]] as const);
  const settled = await Promise.allSettled(
    entries.map(async ([assetSymbol, yahooSymbol]) => [assetSymbol, await fetchYahooPrice(assetSymbol, yahooSymbol)] as const),
  );
  const result: Record<string, AssetPrice> = {};

  for (const item of settled) {
    if (item.status === "fulfilled") {
      result[item.value[0]] = item.value[1];
    }
  }

  return result;
}

async function fetchYahooPrice(assetSymbol: string, yahooSymbol: string): Promise<AssetPrice> {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
    const response = await fetchWithTimeout(proxyUrl, 2500);
    if (!response.ok) throw new Error(`Yahoo price fetch failed for ${assetSymbol}: ${response.status}`);

    const proxyPayload = (await response.json()) as { contents?: string };
    if (!proxyPayload.contents) throw new Error(`Yahoo price response missing contents for ${assetSymbol}`);

    const payload = JSON.parse(proxyPayload.contents) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    const meta = result?.meta;
    const price = meta?.regularMarketPrice ?? meta?.postMarketPrice ?? findLastNumber(result?.indicators?.quote?.[0]?.close);
    const previousClose = meta?.previousClose ?? result?.indicators?.quote?.[0]?.open?.find(isNumber);

    if (!isNumber(price)) throw new Error(`Yahoo price missing for ${assetSymbol}`);

    return {
      symbol: assetSymbol,
      price,
      change24h: isNumber(previousClose) && previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0,
      source: "yahoo",
      lastUpdated: Date.now(),
    };
  } catch {
    const fallback = await fetchStooqPrice(assetSymbol);
    if (fallback) return fallback;
    throw new Error(`No live price available for ${assetSymbol}`);
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { next: { revalidate: 60 }, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchStooqPrice(assetSymbol: string): Promise<AssetPrice | null> {
  const stooqSymbol = stooqFallbackSymbols[assetSymbol];
  if (!stooqSymbol) return null;

  const response = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=json`, {
    next: { revalidate: 60 },
  });
  if (!response.ok) return null;

  const text = await response.text();
  const payload = JSON.parse(text.replaceAll(':"}', ':null}').replaceAll('":}', '":null}').replaceAll(',"volume":}', ',"volume":null}')) as {
    symbols?: Array<{ close?: number; open?: number; symbol?: string; date?: string; time?: string }>;
  };
  const quote = payload.symbols?.[0];
  if (!isNumber(quote?.close)) return null;

  return {
    symbol: assetSymbol,
    price: quote.close,
    change24h: isNumber(quote.open) && quote.open > 0 ? ((quote.close - quote.open) / quote.open) * 100 : 0,
    source: "stooq",
    lastUpdated: quote.date && quote.time ? Date.parse(`${quote.date}T${quote.time}Z`) : Date.now(),
  };
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function findLastNumber(values?: Array<number | null>) {
  if (!values) return undefined;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (isNumber(values[index])) return values[index];
  }
  return undefined;
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        postMarketPrice?: number;
        previousClose?: number;
        regularMarketPrice?: number;
      };
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          open?: Array<number | null>;
        }>;
      };
    }>;
  };
};
