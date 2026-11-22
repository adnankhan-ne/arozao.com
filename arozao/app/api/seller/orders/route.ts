import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

type PhpEnvelope = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: unknown;
  pagination?: unknown;
};

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}

function asRecords(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value ? value : fallback;
}

function numeric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapOrder(row: RecordValue) {
  const rawStatus = text(row.status).toLowerCase();
  const items = asRecords(row.items).map((item) => ({
    id: String(item.id ?? ""),
    productId: String(item.product_id ?? ""),
    productName: text(item.product_name, "Product"),
    sku: "",
    quantity: numeric(item.quantity),
    unitPrice: numeric(item.unit_price),
    lineTotal: numeric(item.subtotal),
  }));
  const fulfillmentStatus =
    rawStatus === "packed"
      ? "Packed"
      : rawStatus === "handed_to_courier" ||
        rawStatus === "in_transit" ||
        rawStatus === "out_for_delivery"
      ? "In Transit"
      : rawStatus === "delivered"
      ? "Delivered"
      : rawStatus === "cancelled" || rawStatus === "returned"
      ? "Cancelled"
      : "Pending Dispatch";

  return {
    id: String(row.id ?? ""),
    orderNumber: text(row.order_number, String(row.id ?? "")),
    parentOrderNumber: text(row.order_number),
    productName:
      items
        .map((item) =>
          item.quantity > 1
            ? `${item.productName} × ${item.quantity}`
            : item.productName
        )
        .join(", ") || "Order items",
    customerName: text(row.shipping_name, "Customer"),
    customerPhone: text(row.shipping_phone),
    customerCity: text(row.shipping_district, "Bangladesh"),
    shippingAddress: [row.shipping_street, row.shipping_landmark]
      .filter((part) => typeof part === "string" && part.trim())
      .join(", "),
    amount: numeric(row.subtotal),
    netSellerPayable: numeric(row.seller_earnings),
    commissionAmount: numeric(row.commission_amount),
    commissionRate: numeric(row.commission_rate),
    paymentStatus:
      text(row.payment_method).toLowerCase() === "cod"
        ? "Cash on Delivery"
        : text(row.payment_status).toLowerCase() === "paid"
        ? "Paid (Online)"
        : "Cash on Delivery",
    fulfillmentStatus,
    courierPartner: text(row.courier_name),
    trackingCode: text(row.tracking_number),
    orderDate: text(row.created_at),
    createdAt: text(row.created_at),
    items,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";
  const response = await fetchPhpApi(
    request,
    `seller/orders?per_page=100&page=${encodeURIComponent(page)}`
  );
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success) {
    return NextResponse.json(
      { ok: false, error: payload.message || payload.error || "Failed to load seller orders." },
      { status: response.status || 502 }
    );
  }
  const pagination = asRecord(payload.pagination);
  return NextResponse.json({
    ok: true,
    orders: asRecords(payload.data).map(mapOrder),
    pagination,
  });
}

export async function PATCH(request: NextRequest) {
  let body: RecordValue;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid order update is required." },
      { status: 400 }
    );
  }

  const subOrderId = text(body.subOrderId);
  if (!/^\d+$/.test(subOrderId)) {
    return NextResponse.json(
      { ok: false, error: "A valid sub-order ID is required." },
      { status: 400 }
    );
  }
  if (body.fulfillmentStatus !== "Packed") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Seller Center can mark a pending parcel as packed. Delivery and cancellation updates must come from the courier or marketplace.",
      },
      { status: 409 }
    );
  }

  const response = await fetchPhpApi(
    request,
    `seller/orders/${subOrderId}/pack`,
    {
      courier_name: text(body.courierPartner, "Arozao Express"),
      tracking_number: text(body.trackingCode),
    },
    "PATCH"
  );
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success) {
    return NextResponse.json(
      { ok: false, error: payload.message || payload.error || "Failed to mark parcel as packed." },
      { status: response.status || 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: payload.message || "Parcel marked as packed.",
  });
}
