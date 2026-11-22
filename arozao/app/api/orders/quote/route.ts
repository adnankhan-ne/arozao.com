import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const shippingMethod = body?.shippingMethod === "express" ? "express" : "standard";
    const deliveryFee = shippingMethod === "express" ? 120 : 60;

    let subtotal = 0;
    const quoteItems = items.map((item: { slug?: string; id?: string; quantity?: number }) => {
      const prod = products.find((p) => p.slug === item.slug || p.id === item.id) || products[0];
      const unitPrice = prod?.salePrice ?? prod?.price ?? 1000;
      const qty = Number(item.quantity ?? 1);
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      return {
        productId: prod?.id || "p1",
        slug: prod?.slug || item.slug || "prod",
        sku: prod?.sku || "SKU-001",
        name: prod?.name || "Product",
        thumbnailUrl: prod?.thumbnail || prod?.image || "",
        unitPrice,
        regularPrice: prod?.price ?? unitPrice,
        salePrice: prod?.salePrice ?? null,
        quantity: qty,
        lineTotal,
        availableStock: prod?.stock ?? 50,
        isAvailable: true,
      };
    });

    let discountAmount = 0;
    let appliedCoupon = null;
    const code = (body?.couponCode || "").trim().toUpperCase();
    if (code === "AROZAO10" || code === "SAVE10") {
      discountAmount = Math.round(subtotal * 0.1);
      appliedCoupon = {
        code,
        discountAmount,
        label: "10% Platform Discount",
      };
    } else if (code === "WELCOME50" || code === "EID50") {
      discountAmount = Math.min(subtotal, 50);
      appliedCoupon = {
        code,
        discountAmount,
        label: "৳50 Flat Discount",
      };
    }

    const grandTotal = Math.max(0, subtotal + deliveryFee - discountAmount);

    return NextResponse.json({
      ok: true,
      quote: {
        valid: true,
        items: quoteItems,
        subtotal,
        baseDeliveryFee: deliveryFee,
        deliveryFee,
        discountAmount,
        grandTotal,
        estimatedDelivery: "2-3 business days",
        appliedCoupon,
        stockErrors: [],
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to calculate quote." },
      { status: 400 }
    );
  }
}
