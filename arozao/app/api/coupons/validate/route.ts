import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code || "").trim().toUpperCase();
    const subtotal = Math.max(0, Number(body?.subtotal ?? 1000));
    const deliveryFee = Math.max(0, Number(body?.deliveryFee ?? 60));

    if (!code) {
      return NextResponse.json(
        { ok: false, valid: false, error: "Please enter a coupon code." },
        { status: 400 }
      );
    }

    if (code === "AROZAO10" || code === "SAVE10") {
      const discountAmount = Math.round(subtotal * 0.1);
      return NextResponse.json({
        ok: true,
        valid: true,
        code,
        discountAmount,
        label: "10% Platform Discount",
        subtotal,
        deliveryFee,
        grandTotal: Math.max(0, subtotal + deliveryFee - discountAmount),
      });
    }

    if (code === "WELCOME50" || code === "EID50") {
      const discountAmount = Math.min(subtotal, 50);
      return NextResponse.json({
        ok: true,
        valid: true,
        code,
        discountAmount,
        label: "৳50 Flat Discount",
        subtotal,
        deliveryFee,
        grandTotal: Math.max(0, subtotal + deliveryFee - discountAmount),
      });
    }

    return NextResponse.json(
      { ok: false, valid: false, error: "Invalid or expired coupon code." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, valid: false, error: "Failed to validate coupon." },
      { status: 500 }
    );
  }
}
