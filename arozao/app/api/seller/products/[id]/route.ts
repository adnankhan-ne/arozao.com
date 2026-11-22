import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    ok: true,
    product: {
      id: params.id,
      title: "Sample Product",
      price: 1500,
      stock: 25,
      status: "Active",
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ok: true,
      product: {
        id: params.id,
        ...body,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update product." }, { status: 400 });
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
