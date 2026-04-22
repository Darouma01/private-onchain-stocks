"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { confidentialWrapperAbi } from "@/lib/contracts";
import { deployedAssets } from "@/lib/deployed-assets";

const EMPTY_HANDLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export type ConfidentialHolding = {
  asset: (typeof deployedAssets)[number];
  handle: `0x${string}`;
};

export function useConfidentialHoldings(connectedAddress?: `0x${string}`, selectedAssetSymbol?: string) {
  const balanceHandles = useReadContracts({
    contracts: deployedAssets.map((asset) => ({
      address: asset.wrapperAddress,
      abi: confidentialWrapperAbi,
      functionName: "getEncryptedBalance",
      args: [connectedAddress ?? ZERO_ADDRESS],
    })),
    query: {
      enabled: Boolean(connectedAddress),
      refetchInterval: 15_000,
    },
  });

  const holdings = useMemo<ConfidentialHolding[]>(() => {
    return deployedAssets.flatMap((asset, index) => {
      const result = balanceHandles.data?.[index];
      const handle = result?.status === "success" ? (result.result as `0x${string}` | undefined) : undefined;
      if (!handle || handle === EMPTY_HANDLE) return [];
      return [{ asset, handle }];
    });
  }, [balanceHandles.data]);

  const holdingsMap = useMemo<Record<string, string>>(
    () =>
      holdings.reduce<Record<string, string>>((acc, holding) => {
        acc[holding.asset.symbol] = holding.handle;
        return acc;
      }, {}),
    [holdings],
  );

  const selectedHandle = useMemo(() => {
    if (!selectedAssetSymbol) return null;
    return holdingsMap[selectedAssetSymbol] ?? null;
  }, [holdingsMap, selectedAssetSymbol]);

  const userTier = useMemo(() => {
    if (holdings.length >= 20) return 4;
    if (holdings.length >= 10) return 3;
    if (holdings.length >= 5) return 2;
    if (holdings.length >= 1) return 1;
    return 0;
  }, [holdings.length]);

  const tierLabel = ["No Holdings", "Basic 🥉", "Premium 🥈", "Institutional 🥇", "Elite 🏛️"][userTier];

  return {
    error: balanceHandles.error,
    holdings,
    heldAssets: holdings.map((holding) => holding.asset),
    holdingsMap,
    isLoading: balanceHandles.isLoading,
    allHandles: balanceHandles.data,
    totalAssetsHeld: holdings.length,
    userTier,
    tierLabel,
    holdsSelectedAsset: selectedHandle !== null,
    selectedHandle,
    refetch: balanceHandles.refetch,
  };
}

export function isEncryptedHandle(value?: string | null) {
  return Boolean(value && value !== EMPTY_HANDLE);
}

export function truncateHandle(handle: string) {
  return `${handle.slice(0, 8)}...${handle.slice(-4)}`;
}
