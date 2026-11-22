import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  const response = await fetchPhpApi(request, `fulfillment${query ? `?${query}` : ""}`);
  const result = await response.json();
  if (!response.ok || !result.success) {
    return NextResponse.json(
      { ok: false, error: result.message || "Failed to load fulfillment details." },
      { status: response.status }
    );
  }
  return NextResponse.json({
    ok: true,
    supportedCouriers: result.data.supported_couriers,
    fulfillment: {
      ...result.data.order,
      statusHistory: result.data.status_history,
    },
  });
}

export async function POST(request: NextRequest) {
  const response = await fetchPhpApi(request, "fulfillment");
  const result = await response.json();
  if (!response.ok || !result.success) {
    return NextResponse.json(
      { ok: false, error: result.message || "Failed to update fulfillment." },
      { status: response.status }
    );
  }
  return NextResponse.json({ ok: true, result: result.data, message: result.message });
}
