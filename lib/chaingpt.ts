import { GeneralChat } from "@chaingpt/generalchat";
import { SmartContractAuditor } from "@chaingpt/smartcontractauditor";

export function getChainGPTApiKey() {
  const apiKey = process.env.CHAINGPT_API_KEY;
  if (!apiKey) {
    throw new Error("CHAINGPT_API_KEY is not configured");
  }
  return apiKey;
}

export function createGeneralChatClient() {
  return new GeneralChat({ apiKey: getChainGPTApiKey() });
}

export function createAuditorClient() {
  return new SmartContractAuditor({ apiKey: getChainGPTApiKey() });
}

export function extractBotText(response: unknown) {
  const maybe = response as { data?: { bot?: unknown }; bot?: unknown; message?: unknown };
  if (typeof maybe.data?.bot === "string") {
    return maybe.data.bot;
  }
  if (typeof maybe.bot === "string") {
    return maybe.bot;
  }
  if (typeof maybe.message === "string") {
    return maybe.message;
  }
  return JSON.stringify(response, null, 2);
}

export function normalizeChainGPTError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "ChainGPT request failed";
}
