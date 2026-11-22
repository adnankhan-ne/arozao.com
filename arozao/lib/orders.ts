import { Order } from "@/types";
import { getAuthAccessToken, getSessionUser } from "@/lib/auth";

export interface AuthoritativeQuoteLineItem {
  productId: string;
  slug: string;
  sku: string;
  name: string;
  thumbnailUrl: string;
  unitPrice: number;
  regularPrice: number;
  salePrice: number | null;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  isAvailable: boolean;
  stockError?: string;
}

export interface AuthoritativeCheckoutQuote {
  valid: boolean;
  items: AuthoritativeQuoteLineItem[];
  subtotal: number;
  baseDeliveryFee: number;
  deliveryFee: number;
  discountAmount: number;
  grandTotal: number;
  estimatedDelivery: string;
  appliedCoupon: {
    code: string;
    discountAmount: number;
    label: string;
  } | null;
  couponError?: string;
  stockErrors: string[];
}

let verifiedOrdersCache: Order[] = [];

function purgeLegacyLocalOrders() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem("arozaoOrders")) {
      localStorage.removeItem("arozaoOrders");
    }
  } catch {
    // Ignore storage access errors
  }
}

export function getOrders(): Order[] {
  purgeLegacyLocalOrders();
  return verifiedOrdersCache;
}

export function getOrderById(id: string): Order | undefined {
  purgeLegacyLocalOrders();
  return verifiedOrdersCache.find((order) => order.id === id);
}

export function getCustomerOrders(): Order[] {
  purgeLegacyLocalOrders();
  const user = getSessionUser();
  if (!user) return [];
  return verifiedOrdersCache.filter(
    (order) => order.customerId === user.id || order.customerEmail === user.email
  );
}

/**
 * Fetches an authoritative checkout quote from the server (/api/orders/quote).
 * Sends ONLY product identifiers (`id`, `slug`), `quantity`, `shippingMethod`, and `couponCode`.
 * All unit prices, stock availability, subtotals, delivery fees, discounts, and grand totals
 * are calculated and validated exclusively by the database.
 */
export async function fetchAuthoritativeCheckoutQuote(input: {
  items: Array<{ id?: string; slug?: string; quantity: number }>;
  shippingMethod: "standard" | "express";
  couponCode?: string;
}): Promise<AuthoritativeCheckoutQuote | null> {
  purgeLegacyLocalOrders();
  const token = getAuthAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Strictly strip any client-side price or total fields before sending
  const sanitizedPayload = {
    shippingMethod: input.shippingMethod === "express" ? "express" : "standard",
    couponCode: input.couponCode?.trim() || undefined,
    items: (input.items || []).map((item) => ({
      id: item.id,
      slug: item.slug,
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    })),
  };

  try {
    const res = await fetch("/api/orders/quote", {
      method: "POST",
      headers,
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(sanitizedPayload),
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (data?.ok && data?.quote) {
      return data.quote as AuthoritativeCheckoutQuote;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches the authenticated customer's orders from the backend API (/api/orders).
 */
export async function fetchCustomerOrdersFromApi(): Promise<Order[]> {
  purgeLegacyLocalOrders();
  const token = getAuthAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch("/api/orders", {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    if (data?.ok && Array.isArray(data.orders)) {
      verifiedOrdersCache = data.orders;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("arozao-order-update"));
      }
      return data.orders;
    }
    return [];
  } catch {
    return verifiedOrdersCache;
  }
}

/**
 * Fetches a single order by order number or UUID from the backend API (/api/orders/[id]).
 */
export async function fetchOrderByIdFromApi(
  orderId: string
): Promise<Order | null> {
  purgeLegacyLocalOrders();
  if (!orderId) return null;
  const token = getAuthAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (data?.ok && data?.order) {
      const fetchedOrder: Order = data.order;
      verifiedOrdersCache = [
        fetchedOrder,
        ...verifiedOrdersCache.filter((o) => o.id !== fetchedOrder.id),
      ];
      return fetchedOrder;
    }
    return null;
  } catch {
    return getOrderById(orderId) || null;
  }
}

/**
 * Creates a real order on the server (/api/orders) with server-side price,
 * stock, delivery fee, coupon, address verification, and seller allocation calculation.
 * Explicitly omits any client-calculated prices, subtotals, discounts, or totals.
 * Never creates a fake local order on failure.
 */
export async function createOrderOnServer(input: {
  addressId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  division: string;
  area: string;
  streetAddress: string;
  notes?: string;
  shippingMethod: "standard" | "express";
  paymentMethod: string;
  walletProvider?: string;
  walletNumber?: string;
  couponCode?: string;
  saveAddressForFuture?: boolean;
  items: Array<{ id?: string; slug?: string; quantity: number }>;
}): Promise<{ order: Order | null; error?: string }> {
  purgeLegacyLocalOrders();
  const token = getAuthAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Strictly transmit only product identifiers and quantities — never prices or totals
  const sanitizedOrderRequest = {
    addressId: input.addressId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    division: input.division,
    area: input.area,
    streetAddress: input.streetAddress,
    notes: input.notes,
    shippingMethod: input.shippingMethod === "express" ? "express" : "standard",
    paymentMethod: input.paymentMethod,
    walletProvider: input.walletProvider,
    walletNumber: input.walletNumber,
    couponCode: input.couponCode?.trim() || undefined,
    saveAddressForFuture: Boolean(input.saveAddressForFuture),
    items: (input.items || []).map((item) => ({
      id: item.id,
      slug: item.slug,
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    })),
  };

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(sanitizedOrderRequest),
    });

    const data = await res.json();
    if (!res.ok || !data?.ok || !data?.order) {
      return {
        order: null,
        error: data?.error || "Failed to place order. Please try again.",
      };
    }

    const createdOrder: Order = data.order;
    verifiedOrdersCache = [
      createdOrder,
      ...verifiedOrdersCache.filter((o) => o.id !== createdOrder.id),
    ];

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("arozao-order-update"));
    }

    return { order: createdOrder };
  } catch (err) {
    return {
      order: null,
      error:
        err instanceof Error
          ? err.message
          : "Network error while placing order.",
    };
  }
}

export function updateOrderStatus(
  orderId: string,
  newStatus: Order["status"]
): Order | null {
  purgeLegacyLocalOrders();
  const target = verifiedOrdersCache.find((o) => o.id === orderId);
  if (!target) return null;

  const updatedOrder: Order = { ...target, status: newStatus };
  verifiedOrdersCache = verifiedOrdersCache.map((o) =>
    o.id === orderId ? updatedOrder : o
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("arozao-order-update"));

    const token = getAuthAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    void fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {});
  }

  return updatedOrder;
}
