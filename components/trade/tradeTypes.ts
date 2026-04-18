"use client";

import type { DeployedAsset } from "@/lib/deployed-assets";
import { parseEther } from "viem";

export type TradeMode = "Wrap" | "Transfer" | "Unwrap";

export type TradeTabProps = {
  selectedAsset: DeployedAsset;
  setSelectedSymbol: (symbol: string) => void;
};

export type TradeStepStatus = "idle" | "pending" | "success" | "error";

export type TradeStep = {
  label: string;
  status: TradeStepStatus;
};

export function safeParseTokenAmount(value: string) {
  try {
    const normalized = value.trim();
    if (!normalized || Number(normalized) <= 0) return null;
    return parseEther(normalized);
  } catch {
    return null;
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Transaction failed";
}
