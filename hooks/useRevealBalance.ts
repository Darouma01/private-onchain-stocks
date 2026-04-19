"use client";

import { useCallback, useState } from "react";
import { encodeFunctionData, formatEther, type Address } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { confidentialWrapperAbi, txUrl } from "@/lib/contracts";

type RevealPhase = "idle" | "signature" | "pending" | "success" | "error";

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
  const walletClient = useWalletClient();
  const [phase, setPhase] = useState<RevealPhase>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [revealedBalance, setRevealedBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetReveal = useCallback(() => {
    setPhase("idle");
    setTxHash(undefined);
    setRevealedBalance(null);
    setError(null);
  }, []);

  const revealBalance = useCallback(async () => {
    if (!isConnected || !owner) {
      setPhase("error");
      setError("Connect wallet before revealing your encrypted balance.");
      return null;
    }
    if (!walletClient.data || !publicClient) {
      setPhase("error");
      setError("Wallet client is not ready. Try again in a moment.");
      return null;
    }

    setPhase("signature");
    setError(null);
    setTxHash(undefined);
    setRevealedBalance(null);

    try {
      const data = encodeFunctionData({
        abi: confidentialWrapperAbi,
        functionName: "decryptBalance",
        args: [owner, "0x"],
      });

      const hash = await walletClient.data.sendTransaction({
        account: owner,
        data,
        to: wrapperAddress,
      });

      setTxHash(hash);
      setPhase("pending");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Reveal transaction reverted.");
      }

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
  }, [assetSymbol, isConnected, owner, publicClient, walletClient.data, wrapperAddress]);

  return {
    error,
    isPending: phase === "signature" || phase === "pending",
    phase,
    revealBalance,
    revealedBalance,
    revealedBalanceFormatted: revealedBalance === null ? null : formatEther(revealedBalance),
    resetReveal,
    txHash,
    txUrl: txHash ? txUrl(txHash) : null,
  };
}
