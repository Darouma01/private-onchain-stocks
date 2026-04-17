"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { deployedAssetBySymbol, deployedAssets } from "@/lib/deployed-assets";

const defaultAssetSymbol = "cAAPL";

export function useSelectedAsset(initialSymbol = defaultAssetSymbol) {
  const [selectedSymbol, setSelectedSymbolState] = useState(() => normalizeSymbol(initialSymbol));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assetParam = params.get("asset");
    if (assetParam) {
      setSelectedSymbolState(normalizeSymbol(assetParam));
    }
  }, []);

  const setSelectedSymbol = useCallback((symbol: string, options?: { updateUrl?: boolean }) => {
    const nextSymbol = normalizeSymbol(symbol);
    setSelectedSymbolState(nextSymbol);

    if (options?.updateUrl === false || typeof window === "undefined") return;

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
    setSelectedSymbol,
  };
}

function normalizeSymbol(symbol: string) {
  const trimmed = symbol.trim();
  return deployedAssetBySymbol(trimmed)?.symbol ?? defaultAssetSymbol;
}
