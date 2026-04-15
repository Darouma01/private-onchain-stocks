export type AuditRiskLevel = "Low" | "Medium" | "High" | "Critical" | "Unknown";

export type AuditResponse = {
  report: string;
  riskLevel: AuditRiskLevel;
  vulnerabilities: string[];
  recommendations: string[];
};

export type TransferActivity = {
  from: string;
  to: string;
  amountHandle: string;
  transactionHash: string;
  blockNumber: string;
};

export type InsightsResponse = {
  tokenSymbol: string;
  totalSupply: string;
  holderCount: string;
  confidentialTransferCount: number;
  recentActivity: TransferActivity[];
  aiSummary: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
