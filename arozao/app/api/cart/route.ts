import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    items: [],
    subtotal: 0,
    count: 0,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ok: true,
      items: Array.isArray(body?.items) ? body.items : [],
      subtotal: 0,
      count: 0,
    });
  } catch {
    return NextResponse.json({ ok: true, items: [], subtotal: 0, count: 0 });
  }
}

export async function DELETE() {
  return NextResponse.json({
    ok: true,
    items: [],
    subtotal: 0,
    count: 0,
  });
}
