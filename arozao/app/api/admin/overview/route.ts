import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

type AdminAction = Record<string, unknown> & { entity?: unknown };
type DashboardData = {
  gmv?: { total_gmv?: number | string; total_orders?: number | string };
  active_sellers?: number | string;
  pending_sellers?: number | string;
  pending_products?: number | string;
  total_products?: number | string;
  pending_payouts?: number | string;
  [key: string]: unknown;
};

function failure(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function forward(
  request: NextRequest,
  endpoint: string,
  method: string,
  body?: unknown
) {
  const response = await fetchPhpApi(request, endpoint, body, method);
  let result: { success?: boolean; message?: string; error?: string; data?: unknown };
  try {
    result = await response.json();
  } catch {
    console.error("[Admin API] PHP backend returned a non-JSON response:", response.status);
    return failure("The backend returned an invalid response. Please check the PHP API logs.", 502);
  }
  if (!response.ok || !result.success) {
    return failure(
      result.error || result.message || "The backend could not complete this admin action.",
      response.status
    );
  }
  return NextResponse.json({ ok: true, message: result.message, data: result.data });
}

export async function GET(request: NextRequest) {
  const response = await fetchPhpApi(request, "admin/dashboard", undefined, "GET");
  let result: { success?: boolean; message?: string; error?: string; data?: DashboardData };
  try {
    result = await response.json();
  } catch {
    console.error("[Admin API] PHP dashboard returned a non-JSON response:", response.status);
    return failure("The backend returned an invalid dashboard response.", 502);
  }
  if (!response.ok || !result.success) {
    return failure(result.error || result.message || "Unable to load the admin dashboard.", response.status);
  }
  const data = result.data || {};
  return NextResponse.json({
    ok: true,
    summary: data.gmv,
    metrics: {
      totalRevenue: Number(data.gmv?.total_gmv || 0),
      totalOrders: Number(data.gmv?.total_orders || 0),
      activeSellers: Number(data.active_sellers || 0),
      pendingSellers: Number(data.pending_sellers || 0),
      pendingProducts: Number(data.pending_products || 0),
      totalProducts: Number(data.total_products || 0),
      pendingPayouts: Number(data.pending_payouts || 0),
    },
    ...data,
  });
}

export async function POST(request: NextRequest) {
  let action: AdminAction;
  try {
    action = (await request.json()) as AdminAction;
  } catch {
    return failure("A valid JSON admin action is required.");
  }

  const id = (value: unknown, label: string): string | null => {
    if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim()) {
      return null;
    }
    return encodeURIComponent(String(value).trim());
  };
  const entity = action.entity;

  switch (entity) {
    case "seller_status": {
      const sellerId = id(action.sellerId, "sellerId");
      if (!sellerId) return failure("A valid seller ID is required.");
      const body: Record<string, unknown> = {};
      if (action.status !== undefined) body.status = action.status;
      if (action.commissionRateOverride !== undefined) {
        body.commission_rate = action.commissionRateOverride;
      }
      if (action.isVerified !== undefined && body.status === undefined) {
        return failure("Seller verification cannot be changed without a status update.");
      }
      return forward(request, `admin/sellers/${sellerId}/status`, "PATCH", body);
    }
    case "order_status": {
      const orderId = id(action.orderId, "orderId");
      if (!orderId) return failure("A valid order ID is required.");
      const statusMap: Record<string, string> = {
        Shipped: "shipped",
        Delivered: "delivered",
        Cancelled: "cancelled",
      };
      const status = typeof action.status === "string" ? statusMap[action.status] : undefined;
      if (!status) return failure("Choose a supported order status.");
      return forward(request, `admin/orders/${orderId}/status`, "PATCH", { status });
    }
    case "product_moderation": {
      const productId = id(action.productId, "productId");
      if (!productId) return failure("A valid product ID is required.");
      const body: Record<string, unknown> = {};
      if (action.status !== undefined) {
        if (action.status !== "active" && action.status !== "suspended") {
          return failure("Choose a supported product status.");
        }
        body.status = action.status === "suspended" ? "archived" : action.status;
      }
      if (action.stock !== undefined) body.stock = action.stock;
      if (action.isFeatured !== undefined) body.is_featured = action.isFeatured;
      return forward(request, `admin/products/${productId}`, "PATCH", body);
    }
    case "customer_status": {
      const userId = id(action.userId, "userId");
      if (!userId || typeof action.isActive !== "boolean") {
        return failure("A valid customer ID and active status are required.");
      }
      return forward(request, `admin/customers/${userId}/status`, "PATCH", {
        is_active: action.isActive,
      });
    }
    case "category": {
      if (typeof action.name !== "string" || !action.name.trim()) {
        return failure("A category name is required.");
      }
      return forward(request, "categories", "POST", {
        name: action.name.trim(),
        commission_rate: action.defaultCommissionRate,
      });
    }
    case "brand": {
      if (typeof action.name !== "string" || !action.name.trim()) {
        return failure("A brand name is required.");
      }
      return forward(request, "brands", "POST", {
        name: action.name.trim(),
        is_official: Boolean(action.isFeatured),
      });
    }
    case "coupon": {
      const code = typeof action.code === "string" ? action.code.trim() : "";
      const discountType =
        action.discountType === "percentage"
          ? "percentage"
          : action.discountType === "fixed"
            ? "flat"
            : null;
      if (!code || !discountType || typeof action.discountValue !== "number") {
        return failure("Coupon code, discount type, and discount value are required.");
      }
      const body = {
        code,
        discount_type: discountType,
        discount_value: action.discountValue,
        min_spend: typeof action.minOrderAmount === "number" ? action.minOrderAmount : 0,
        is_active: typeof action.isActive === "boolean" ? action.isActive : true,
      };
      if (action.mode === "update") {
        const couponId = id(action.id, "id");
        if (!couponId) return failure("A valid coupon ID is required.");
        return forward(request, `coupons/${couponId}`, "PUT", body);
      }
      return forward(request, "coupons", "POST", body);
    }
    case "commission_rule": {
      const categoryId = id(action.categoryId, "categoryId");
      if (!categoryId) {
        return failure("Select a category before updating its commission rate.");
      }
      return forward(request, `admin/commissions/${categoryId}`, "PUT", {
        commission_rate: action.commissionPercentage,
      });
    }
    default:
      return failure("Unsupported admin action.");
  }
}
