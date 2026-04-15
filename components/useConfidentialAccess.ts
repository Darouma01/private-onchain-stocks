"use client";

import { useMemo } from "react";
import { parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { confidentialCAAPLAbi, confidentialCAAPLAddress } from "@/lib/contracts";

const emptyHandle = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const vipBalanceThreshold = parseEther("50");

export function useConfidentialAccess() {
  const { address, isConnected } = useAccount();

  const encrypted = useReadContract({
    address: confidentialCAAPLAddress,
    abi: confidentialCAAPLAbi,
    functionName: "getEncryptedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const reveal = useReadContract({
    address: confidentialCAAPLAddress,
    abi: confidentialCAAPLAbi,
    functionName: "decryptBalance",
    args: address ? [address, "0x"] : undefined,
    account: address,
    query: { enabled: false },
  });

  const hasEncryptedBalance = Boolean(encrypted.data && encrypted.data !== emptyHandle);
  const isVip = typeof reveal.data === "bigint" && reveal.data >= vipBalanceThreshold;

  return useMemo(
    () => ({
      address,
      isConnected,
      encryptedBalance: encrypted.data,
      hasEncryptedBalance,
      encryptedLoading: encrypted.isLoading,
      encryptedError: encrypted.error,
      refetchEncryptedBalance: encrypted.refetch,
      revealedBalance: reveal.data,
      revealLoading: reveal.isLoading,
      revealError: reveal.error,
      revealBalance: reveal.refetch,
      isVip,
    }),
    [
      address,
      encrypted.data,
      encrypted.error,
      encrypted.isLoading,
      encrypted.refetch,
      hasEncryptedBalance,
      isConnected,
      isVip,
      reveal.data,
      reveal.error,
      reveal.isLoading,
      reveal.refetch,
    ],
  );
}
