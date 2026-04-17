"use client";

import { createContext, createElement, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { AssetPrice } from "@/lib/prices/priceService";

type PricesContextValue = {
  prices: Record<string, AssetPrice>;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
};

const PricesContext = createContext<PricesContextValue | null>(null);
let cachedPrices: Record<string, AssetPrice> = {};

export function PricesProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<string, AssetPrice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPrices() {
      setIsLoading((current) => Object.keys(cachedPrices).length === 0 || current);
      try {
        const response = await fetch("/api/prices", { cache: "no-store" });
        const payload = (await response.json()) as {
          error?: string;
          lastRefresh?: string | null;
          prices?: Record<string, AssetPrice>;
        };
        if (!response.ok) throw new Error(payload.error ?? "Price data unavailable");
        if (cancelled) return;

        const nextPrices = payload.prices ?? {};
        cachedPrices = nextPrices;
        setPrices(nextPrices);
        setLastRefresh(payload.lastRefresh ? new Date(payload.lastRefresh) : new Date());
        setError(null);
      } catch (caught) {
        if (cancelled) return;
        setPrices(cachedPrices);
        setError(caught instanceof Error ? caught.message : "Price data unavailable");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadPrices();
    const interval = window.setInterval(() => void loadPrices(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const value = useMemo(
    () => ({ error, isLoading, lastRefresh, prices }),
    [error, isLoading, lastRefresh, prices],
  );

  return createElement(PricesContext.Provider, { value }, children);
}

export function usePrices(): PricesContextValue {
  const context = useContext(PricesContext);
  if (!context) {
    return {
      error: null,
      isLoading: false,
      lastRefresh: null,
      prices: cachedPrices,
    };
  }
  cachedPrices = context.prices;
  return context;
}

export function getCachedAssetPrice(symbol: string) {
  return cachedPrices[symbol];
}
