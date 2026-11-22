import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

type ApiEnvelope = {
  success?: boolean;
  data?: unknown;
  message?: string;
  error?: string;
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

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapProduct(product: RecordValue) {
  const status = text(product.status).toLowerCase();
  return {
    id: String(product.id ?? ""),
    slug: text(product.slug),
    name: text(product.name, "Untitled product"),
    sku: text(product.sku),
    category: text(product.category_name, "Uncategorized"),
    price: number(product.sale_price || product.regular_price),
    regularPrice: number(product.regular_price),
    salePrice: number(product.sale_price || product.regular_price),
    stock: number(product.stock),
    status:
      status === "out_of_stock"
        ? "out-of-stock"
        : status === "pending_review"
        ? "draft"
        : status === "archived"
        ? "archived"
        : status === "active"
        ? "active"
        : "draft",
    salesCount: number(product.total_sold),
    image: text(product.primary_image, "/images/product-placeholder.svg"),
    createdAt: text(product.created_at),
  };
}

function mapOrder(order: RecordValue) {
  const rawStatus = text(order.status).toLowerCase();
  const fulfillmentStatus =
    rawStatus === "packed"
      ? "Packed"
      : rawStatus === "confirmed" || rawStatus === "handed_to_courier"
      ? "Handed to Courier"
      : rawStatus === "in_transit" ||
        rawStatus === "out_for_delivery"
      ? "In Transit"
      : rawStatus === "delivered"
      ? "Delivered"
      : rawStatus === "cancelled" || rawStatus === "returned"
      ? "Cancelled"
      : "Pending Dispatch";
  const items = asRecords(order.items);
  const productName = items
    .map((item) => {
      const quantity = number(item.quantity);
      return `${text(item.product_name, "Product")}${quantity > 1 ? ` × ${quantity}` : ""}`;
    })
    .join(", ");

  return {
    id: String(order.id ?? ""),
    orderNumber: text(order.order_number, String(order.id ?? "")),
    parentOrderNumber: text(order.order_number),
    productName: productName || "Order items",
    customerName: text(order.shipping_name, "Customer"),
    customerPhone: text(order.shipping_phone),
    customerCity: text(order.shipping_district, "Bangladesh"),
    shippingAddress: "",
    amount: number(order.subtotal),
    netSellerPayable: number(order.seller_earnings),
    commissionAmount: number(order.commission_amount),
    paymentStatus:
      text(order.payment_method).toLowerCase() === "cod"
        ? "Cash on Delivery"
        : "Paid (Online)",
    fulfillmentStatus,
    courierPartner: text(order.courier_name),
    trackingCode: text(order.tracking_number),
    orderDate: text(order.created_at),
    createdAt: text(order.created_at),
    items: items.map((item, index) => ({
      id: `${order.id ?? "order"}-${index}`,
      productId: "",
      productName: text(item.product_name, "Product"),
      sku: "",
      quantity: number(item.quantity),
      unitPrice: number(item.unit_price),
      lineTotal: number(item.subtotal),
    })),
  };
}

export async function GET(request: NextRequest) {
  const endpoints = [
    "seller/dashboard",
    "seller/products?per_page=100",
    "seller/orders?per_page=100",
    "seller/store",
  ];
  const responses = await Promise.all(
    endpoints.map((endpoint) => fetchPhpApi(request, endpoint))
  );
  const payloads = (await Promise.all(
    responses.map((response) => response.json())
  )) as ApiEnvelope[];

  const failedIndex = responses.findIndex(
    (response, index) => !response.ok || !payloads[index]?.success
  );
  if (failedIndex !== -1) {
    const failedPayload = payloads[failedIndex];
    return NextResponse.json(
      {
        ok: false,
        error:
          failedPayload?.message ||
          failedPayload?.error ||
          "Unable to load seller dashboard data from the PHP API.",
      },
      { status: responses[failedIndex].status || 502 }
    );
  }

  const dashboard = asRecord(payloads[0].data);
  const productPayload = asRecord(payloads[1]);
  const orderPayload = asRecord(payloads[2]);
  const store = asRecord(payloads[3].data);
  const productRows = asRecords(productPayload.data);
  const orderRows = asRecords(orderPayload.data);
  const revenue = asRecord(dashboard.revenue);
  const dailyChart = asRecords(dashboard.daily_chart);
  const sellerStatus = text(store.status).toLowerCase();
  const rawNid = text(store.nid_number);

  const products = productRows.map(mapProduct);
  const orders = orderRows.map(mapOrder);

  return NextResponse.json({
    ok: true,
    seller: {
      storeName: text(store.store_name, "Merchant Store"),
    },
    products,
    orders,
    dailyTrend: dailyChart.map((point) => {
      const revenueValue = number(point.revenue);
      const orderCount = number(point.orders);
      return {
        date: text(point.date),
        fullDate: text(point.date),
        dayName: text(point.date).slice(-2),
        revenue: revenueValue,
        orders: orderCount,
        aov: orderCount > 0 ? Math.round(revenueValue / orderCount) : 0,
      };
    }),
    metrics: {
      totalProducts: number(dashboard.total_products),
      activeProducts: products.filter((product) => product.status === "active")
        .length,
      outOfStockProducts: products.filter(
        (product) => product.status === "out-of-stock"
      ).length,
      lowStockCount: products.filter(
        (product) => product.stock > 0 && product.stock <= 5
      ).length,
      totalOrders: number(asRecord(orderPayload.pagination).total),
      pendingDispatchCount: number(dashboard.pending_orders),
      inTransitCount: orders.filter(
        (order) => order.fulfillmentStatus === "In Transit"
      ).length,
      completedOrdersCount: orders.filter(
        (order) => order.fulfillmentStatus === "Delivered"
      ).length,
      cancelledOrdersCount: orders.filter(
        (order) => order.fulfillmentStatus === "Cancelled"
      ).length,
      grossRevenue: number(revenue.month),
      netEarnings: number(dashboard.balance),
      pendingEarnings: number(dashboard.escrow_balance),
      availablePayoutBalance: number(dashboard.balance),
      processingPayoutBalance: 0,
      paidOutBalance: 0,
    },
    compliance: {
      nidVerified: sellerStatus === "approved",
      tradeComplianceActive: sellerStatus === "approved",
      settlementAccountLinked: Boolean(store.bank_account || store.mfs_wallet),
      ownerLegalName: "",
      maskedNid: rawNid.length >= 4 ? `•••• ${rawNid.slice(-4)}` : "",
      payoutAccountLabel: text(store.payout_method, "Payout account not set"),
    },
  });
}
