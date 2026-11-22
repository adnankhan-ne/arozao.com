import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    return NextResponse.json({
      ok: true,
      message: "Webhook processed successfully",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Webhook processing error" }, { status: 400 });
  }
}
