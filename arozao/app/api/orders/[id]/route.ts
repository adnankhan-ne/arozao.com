import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  return NextResponse.json({
    ok: true,
    order: {
      id: orderId,
      orderNumber: orderId,
      customer: {
        name: "Verified Customer",
        email: "customer@arozao.com",
        phone: "01700000000",
      },
      items: [],
      subtotal: 0,
      deliveryFee: 60,
      discount: 0,
      total: 60,
      currency: "BDT",
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shippingAddress: {},
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
      orderId: params.id,
      status: body.status || "confirmed",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update order." }, { status: 400 });
  }
}
