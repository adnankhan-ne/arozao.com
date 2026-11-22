import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    addresses: [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ok: true,
      address: {
        id: `addr_${Date.now()}`,
        ...body,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save address." }, { status: 400 });
  }
}
