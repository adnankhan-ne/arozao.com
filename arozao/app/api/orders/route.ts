import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    count: 0,
    orders: [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = `ARZ-${Math.floor(100000 + Math.random() * 900000)}`;
    const items = Array.isArray(body?.items) ? body.items : [];
    const subtotal = items.reduce(
      (sum: number, it: { price?: number; quantity?: number }) =>
        sum + (it.price || 0) * (it.quantity || 1),
      0
    );
    const deliveryFee = body?.shippingMethod === "express" ? 120 : 60;
    const discount = body?.discountAmount || 0;
    const total = Math.max(0, subtotal + deliveryFee - discount);

    const createdOrder = {
      id: orderId,
      orderNumber: orderId,
      customer: {
        name: body?.shippingAddress?.name || "Customer",
        email: body?.customerEmail || "customer@example.com",
        phone: body?.shippingAddress?.phone || "01700000000",
      },
      items,
      subtotal,
      deliveryFee,
      discount,
      total,
      currency: "BDT",
      status: "pending",
      paymentMethod: body?.paymentMethod || "cod",
      paymentStatus: body?.paymentMethod === "cod" ? "unpaid" : "paid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shippingAddress: body?.shippingAddress || {},
    };

    return NextResponse.json({
      ok: true,
      order: createdOrder,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to place order." },
      { status: 400 }
    );
  }
}
