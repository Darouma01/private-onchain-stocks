import { NextResponse } from "next/server";
import { setPersonaStatus } from "@/lib/kyc/personaStore";

type PersonaWebhook = {
  data?: {
    attributes?: {
      "reference-id"?: string;
      status?: string;
      fields?: {
        country?: { value?: string };
      };
    };
  };
  referenceId?: string;
  status?: string;
  walletAddress?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as PersonaWebhook;
  const attributes = payload.data?.attributes;
  const address = payload.walletAddress ?? payload.referenceId ?? attributes?.["reference-id"] ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Webhook missing wallet reference-id" }, { status: 400 });
  }

  const personaStatus = (payload.status ?? attributes?.status ?? "").toLowerCase();
  const verified = ["approved", "completed", "verified"].includes(personaStatus);
  const record = setPersonaStatus(address, {
    country: attributes?.fields?.country?.value,
    status: verified ? "verified" : "pending",
  });

  return NextResponse.json({
    address,
    note: "Persona status recorded. Production deployments should also submit the on-chain identity-registry whitelist transaction here.",
    record,
  });
}
