"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { confidentialWrapperAbi } from "@/lib/contracts";
import { deployedAssets } from "@/lib/deployed-assets";
import { getCachedAssetPrice } from "@/lib/prices/usePrices";

const EMPTY_HANDLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export type ConfidentialHolding = {
  asset: (typeof deployedAssets)[number];
  estimatedValue: number | null;
  handle: `0x${string}`;
  price: number | null;
};

export function useConfidentialHoldings() {
  const { address, isConnected } = useAccount();
  const balanceHandles = useReadContracts({
    contracts: deployedAssets.map((asset) => ({
      address: asset.wrapperAddress,
      abi: confidentialWrapperAbi,
      functionName: "getEncryptedBalance",
      args: [address ?? ZERO_ADDRESS],
    })),
    query: {
      enabled: Boolean(address),
    },
  });

  const holdings = useMemo<ConfidentialHolding[]>(() => {
    return deployedAssets.flatMap((asset, index) => {
      const result = balanceHandles.data?.[index];
      const handle = result?.status === "success" ? (result.result as `0x${string}` | undefined) : undefined;
      if (!handle || handle === EMPTY_HANDLE) return [];

      const quote = getCachedAssetPrice(asset.symbol);
      return [
        {
          asset,
          estimatedValue: quote ? quote.price : null,
          handle,
          price: quote?.price ?? null,
        },
      ];
    });
  }, [balanceHandles.data]);

  return {
    error: balanceHandles.error,
    holdings,
    isConnected,
    isLoading: balanceHandles.isLoading,
    refetch: balanceHandles.refetch,
  };
}

export function isEncryptedHandle(value?: string | null) {
  return Boolean(value && value !== EMPTY_HANDLE);
}

export function truncateHandle(handle: string) {
  return `${handle.slice(0, 8)}...${handle.slice(-4)}`;
}
