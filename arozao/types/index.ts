export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  salePrice: number;
  discount?: number;
  currency: string;
  stock: number;
  availability: "in-stock" | "out-of-stock";
  images: string[];
  thumbnail: string;
  specifications: Record<string, string>;
  features: string[];
  tags: string[];
  keywords: string[];
  reviewCount: number;
  status: "active" | "draft" | "archived" | "out-of-stock";
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  createdAt: string;
  updatedAt: string;
  /** Backwards-compatible presentation fields used by the existing storefront. */
  description: string;
  image: string;
  rating: number;
  /** Multi-vendor marketplace seller attribution. */
  sellerId?: string;
  sellerName?: string;
  sellerSlug?: string;
};

export type CartItem = Product & { quantity: number };

export type WishlistItem = Product;

export type OrderItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

export type OrderSubOrderSummary = {
  id: string;
  subOrderNumber: string;
  sellerId: string;
  storeName?: string;
  storeSlug?: string;
  subtotal: number;
  fulfillmentStatus: string;
  courierPartner?: string | null;
  trackingCode?: string | null;
};

export type OrderStatusHistoryItem = {
  id: string;
  oldStatus?: string | null;
  newStatus: string;
  eventTitle: string;
  eventDescription?: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  customerId?: string;
  customerEmail?: string;
  items: OrderItem[];
  customer: {
    name: string;
    phone: string;
    address: string;
    city?: string;
    notes?: string;
    payment: string;
  };
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: "Processing" | "Confirmed" | "Shipped" | "Delivered";
  createdAt: string;
  estimatedDelivery: string;
  subOrders?: OrderSubOrderSummary[];
  statusHistory?: OrderStatusHistoryItem[];
};

