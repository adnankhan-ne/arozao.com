import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ok: true,
      address: {
        id: params.id,
        ...body,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update address." }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    ok: true,
    deletedId: params.id,
  });
}
