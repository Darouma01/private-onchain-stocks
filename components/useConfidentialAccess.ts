"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { confidentialCAAPLAbi, confidentialCAAPLAddress } from "@/lib/contracts";

const emptyHandle = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const vipBalanceThreshold = parseEther("50");

export function useConfidentialAccess() {
  const { address, isConnected } = useAccount();
  const [holderThresholdHandle, setHolderThresholdHandle] = useState<`0x${string}` | null>(null);
  const [thresholdError, setThresholdError] = useState<Error | null>(null);

  const encrypted = useReadContract({
    address: confidentialCAAPLAddress,
    abi: confidentialCAAPLAbi,
    functionName: "getEncryptedBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  useEffect(() => {
    let cancelled = false;

    async function createHolderThreshold() {
      if (!address || holderThresholdHandle) return;
      setThresholdError(null);
      try {
        const response = await fetch("/api/demo/create-handle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: "1" }),
        });
        const payload = (await response.json()) as { handle?: `0x${string}`; error?: string };
        if (!response.ok || !payload.handle) {
          throw new Error(payload.error ?? "Unable to create holder threshold handle");
        }
        if (!cancelled) {
          setHolderThresholdHandle(payload.handle);
        }
      } catch (caught) {
        if (!cancelled) {
          setThresholdError(caught instanceof Error ? caught : new Error("Unable to create holder threshold handle"));
        }
      }
    }

    void createHolderThreshold();

    return () => {
      cancelled = true;
    };
  }, [address, holderThresholdHandle]);

  const holderAccess = useReadContract({
    address: confidentialCAAPLAddress,
    abi: confidentialCAAPLAbi,
    functionName: "hasMinimumBalance",
    args: address && holderThresholdHandle ? [address, BigInt(holderThresholdHandle)] : undefined,
    query: { enabled: Boolean(address && holderThresholdHandle) },
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
  const hasHolderAccess = Boolean(holderAccess.data);
  const isVip = typeof reveal.data === "bigint" && reveal.data >= vipBalanceThreshold;

  return useMemo(
    () => ({
      address,
      isConnected,
      encryptedBalance: encrypted.data,
      hasEncryptedBalance,
      hasHolderAccess,
      encryptedLoading: encrypted.isLoading,
      encryptedError: encrypted.error ?? holderAccess.error ?? thresholdError,
      refetchEncryptedBalance: encrypted.refetch,
      refetchHolderAccess: holderAccess.refetch,
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
      hasHolderAccess,
      holderAccess.error,
      holderAccess.refetch,
      isConnected,
      isVip,
      reveal.data,
      reveal.error,
      reveal.isLoading,
      reveal.refetch,
      thresholdError,
    ],
  );
}
