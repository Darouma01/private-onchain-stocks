"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { deployedAssetBySymbol, deployedAssets, type DeployedAsset } from "@/lib/deployed-assets";

const defaultAssetSymbol = "cAAPL";
const storageKey = "private-stocks:selected-asset";
const recentStorageKey = "private-stocks:recent-assets";
const eventName = "private-stocks:selected-asset-change";

export function useSelectedAsset(initialSymbol?: string) {
  const [selectedSymbol, setSelectedSymbolState] = useState(() => normalizeSymbol(initialSymbol ?? defaultAssetSymbol));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("asset");
    const fromSession = window.sessionStorage.getItem(storageKey);
    setSelectedSymbolState(normalizeSymbol(fromUrl ?? fromSession ?? initialSymbol ?? defaultAssetSymbol));

    function onAssetChange(event: Event) {
      const symbol = (event as CustomEvent<string>).detail;
      setSelectedSymbolState(normalizeSymbol(symbol));
    }

    window.addEventListener(eventName, onAssetChange);
    return () => window.removeEventListener(eventName, onAssetChange);
  }, [initialSymbol]);

  const setSelectedAsset = useCallback((assetOrSymbol: DeployedAsset | string, options?: { updateUrl?: boolean }) => {
    const nextSymbol = normalizeSymbol(typeof assetOrSymbol === "string" ? assetOrSymbol : assetOrSymbol.symbol);
    setSelectedSymbolState(nextSymbol);

    window.sessionStorage.setItem(storageKey, nextSymbol);
    trackRecentAsset(nextSymbol);
    window.dispatchEvent(new CustomEvent(eventName, { detail: nextSymbol }));

    if (options?.updateUrl === false) return;

    const url = new URL(window.location.href);
    url.searchParams.set("asset", nextSymbol);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const selectedAsset = useMemo(() => {
    return deployedAssetBySymbol(selectedSymbol) ?? deployedAssetBySymbol(defaultAssetSymbol) ?? deployedAssets[0];
  }, [selectedSymbol]);

  return {
    selectedAsset,
    selectedSymbol: selectedAsset.symbol,
    setSelectedAsset,
    setSelectedSymbol: setSelectedAsset,
  };
}

function normalizeSymbol(symbol: string) {
  return deployedAssetBySymbol(symbol.trim())?.symbol ?? defaultAssetSymbol;
}

function trackRecentAsset(symbol: string) {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(recentStorageKey) ?? "[]") as string[];
    const next = [symbol, ...parsed.filter((item) => item !== symbol)].slice(0, 5);
    window.sessionStorage.setItem(recentStorageKey, JSON.stringify(next));
  } catch {
    window.sessionStorage.setItem(recentStorageKey, JSON.stringify([symbol]));
  }
}
