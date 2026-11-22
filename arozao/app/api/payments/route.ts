import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId") || "";

  return NextResponse.json({
    ok: true,
    orderId,
    payments: [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ok: true,
      transactionId: `TXN-${Date.now()}`,
      status: "success",
      method: body?.method || "cod",
      amount: body?.amount || 0,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to process payment." }, { status: 400 });
  }
}
