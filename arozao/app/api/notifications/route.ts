import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    unreadCount: 0,
    notifications: [],
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ok: true,
      updated: body?.id ? [body.id] : [],
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update notification." }, { status: 400 });
  }
}

export async function DELETE() {
  return NextResponse.json({
    ok: true,
    deleted: 0,
  });
}
