"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { confidentialWrapperAbi } from "@/lib/contracts";
import { deployedAssets, type DeployedAsset } from "@/lib/deployed-assets";

const emptyHandle = "0x0000000000000000000000000000000000000000000000000000000000000000";
const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

export function useSelectedConfidentialBalance(asset: DeployedAsset) {
  const { address, isConnected } = useAccount();
  const balance = useReadContract({
    address: asset.wrapperAddress,
    abi: confidentialWrapperAbi,
    functionName: "getEncryptedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const hasSelectedAssetBalance = Boolean(balance.data && balance.data !== emptyHandle);

  return {
    address,
    encryptedBalance: balance.data,
    error: balance.error,
    hasSelectedAssetBalance,
    isConnected,
    loading: balance.isLoading,
    refetch: balance.refetch,
  };
}

export function useAnyConfidentialBalance(allAssets = deployedAssets) {
  const { address, isConnected } = useAccount();
  const balances = useReadContracts({
    contracts: allAssets.map((asset) => ({
      address: asset.wrapperAddress,
      abi: confidentialWrapperAbi,
      functionName: "getEncryptedBalance",
      args: [address ?? zeroAddress],
    })),
    query: { enabled: Boolean(address) },
  });

  const heldAssets = useMemo(() => {
    return allAssets.filter((_, index) => {
      const result = balances.data?.[index];
      return result?.status === "success" && Boolean(result.result) && result.result !== emptyHandle;
    });
  }, [allAssets, balances.data]);

  return {
    error: balances.error,
    firstHeldAsset: heldAssets[0],
    hasAnyConfidentialBalance: heldAssets.length > 0,
    heldAssets,
    isConnected,
    loading: balances.isLoading,
    refetch: balances.refetch,
  };
}
