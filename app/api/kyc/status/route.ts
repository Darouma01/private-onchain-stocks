import { NextResponse } from "next/server";
import { getPersonaStatus } from "@/lib/kyc/personaStore";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Valid address is required" }, { status: 400 });
  }

  const record = getPersonaStatus(address);
  return NextResponse.json({
    address,
    country: record?.country ?? null,
    status: record?.status ?? "pending",
    updatedAt: record?.updatedAt ?? null,
    verified: record?.status === "verified",
  });
}
