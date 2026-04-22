"use client";

import { useCallback, useState } from "react";
import { formatEther, type Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { confidentialWrapperAbi } from "@/lib/contracts";

type RevealPhase = "idle" | "pending" | "success" | "error";

export function useRevealBalance({
  assetSymbol,
  owner,
  wrapperAddress,
}: {
  assetSymbol: string;
  owner?: Address;
  wrapperAddress: Address;
}) {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [phase, setPhase] = useState<RevealPhase>("idle");
  const [revealedBalance, setRevealedBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetReveal = useCallback(() => {
    setPhase("idle");
    setRevealedBalance(null);
    setError(null);
  }, []);

  const revealBalance = useCallback(async () => {
    if (!isConnected || !owner) {
      setPhase("error");
      setError("Connect wallet before revealing your encrypted balance.");
      return null;
    }
    if (!publicClient) {
      setPhase("error");
      setError("Network client is not ready. Try again in a moment.");
      return null;
    }

    setPhase("pending");
    setError(null);
    setRevealedBalance(null);

    try {
      const balance = await publicClient.readContract({
        account: owner,
        address: wrapperAddress,
        abi: confidentialWrapperAbi,
        functionName: "decryptBalance",
        args: [owner, "0x"],
      });

      setRevealedBalance(balance);
      setPhase("success");
      return balance;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : `${assetSymbol} balance reveal failed.`;
      setPhase("error");
      setError(message);
      return null;
    }
  }, [assetSymbol, isConnected, owner, publicClient, wrapperAddress]);

  return {
    error,
    isPending: phase === "pending",
    phase,
    revealBalance,
    revealedBalance,
    revealedBalanceFormatted: revealedBalance === null ? null : formatEther(revealedBalance),
    resetReveal,
    txHash: undefined,
    txUrl: null,
  };
}
