import { NextResponse } from "next/server";
import { fetchAllPrices } from "@/lib/prices/priceService";

export const revalidate = 60;

export async function GET() {
  try {
    const prices = await fetchAllPrices();
    return NextResponse.json({
      lastRefresh: new Date().toISOString(),
      prices,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch live prices";
    return NextResponse.json({ error: message, lastRefresh: null, prices: {} }, { status: 502 });
  }
}
