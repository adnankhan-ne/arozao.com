"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  fetchCustomerOrdersFromApi,
  getCustomerOrders,
} from "@/lib/orders";
import { useCart } from "@/components/CartProvider";
import { useToast } from "@/components/ToastNotification";
import { Order, Product } from "@/types";
import { getProduct } from "@/lib/products";
import {
  fetchCurrentProfile,
  getSessionUser,
  SessionUser,
} from "@/lib/auth";
import { OrderTrackingModal } from "@/components/OrderTrackingModal";
import { Truck, MapPin, RotateCcw, Package } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<Order | null>(null);
  const { add } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;

    async function verifyAndLoadOrders() {
      const cached = getSessionUser();
      if (cached) setUser(cached);

      const verified = await fetchCurrentProfile();
      if (!active) return;

      setUser(verified);
      const loadedOrders = verified ? await fetchCustomerOrdersFromApi() : [];
      if (!active) return;
      setOrders(loadedOrders);
      setHydrated(true);

      if (typeof window !== "undefined" && verified) {
        const params = new URLSearchParams(window.location.search);
        const trackId = params.get("track") || params.get("orderId");
        if (trackId) {
          const found = loadedOrders.find((o) => o.id === trackId);
          if (found) setSelectedOrderForTracking(found);
        }
      }
    }

    void verifyAndLoadOrders();

    const handleOrderUpdate = () => {
      const refreshed = getCustomerOrders();
      setOrders(refreshed);
      setSelectedOrderForTracking((current) => {
        if (!current) return null;
        return refreshed.find((o) => o.id === current.id) || current;
      });
    };

    window.addEventListener("arozao-order-update", handleOrderUpdate);
    return () => {
      active = false;
      window.removeEventListener("arozao-order-update", handleOrderUpdate);
    };
  }, []);

  const handleBuyAgain = (order: Order) => {
    let addedCount = 0;
    order.items.forEach((item) => {
      const fullProduct =
        getProduct(item.slug) ||
        ({
          id: item.id || item.slug,
          sku: item.slug,
          slug: item.slug,
          name: item.name,
          shortDescription: item.name,
          description: item.name,
          category: "general",
          subcategory: "general",
          brand: "Arozao",
          price: item.price,
          salePrice: item.price,
          currency: "BDT",
          stock: 99,
          availability: "in-stock",
          images: [item.image],
          thumbnail: item.image,
          image: item.image,
          specifications: {},
          features: [],
          tags: [],
          keywords: [item.name],
          reviewCount: 1,
          rating: 4.8,
          status: "active",
          featured: false,
          bestseller: false,
          newArrival: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Product);

      add(fullProduct, item.quantity);
      addedCount += item.quantity;
    });

    showToast(`Added ${addedCount} items from order #${order.id} to your cart!`, {
      type: "success",
      actionLabel: "View Cart",
      actionHref: "/cart",
    });
  };

  if (!hydrated) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <p>Loading your orders...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="site-content">
        <div className="empty-state" style={{ maxWidth: 540, margin: "0 auto", padding: "40px 24px" }}>
          <div className="empty-icon">🔐</div>
          <h2>Sign in to view your orders</h2>
          <p>Your recent purchases and delivery updates will appear here after login.</p>
          <div className="empty-actions" style={{ flexDirection: "column", gap: 12, marginTop: 20 }}>
            <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "center" }}>
              <Link href="/login?redirect=/orders" className="button button-primary" style={{ flex: 1, textAlign: "center" }}>
                Sign in
              </Link>
              <Link href="/register" className="button button-secondary" style={{ flex: 1, textAlign: "center" }}>
                Create account
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="site-content orders-page-content">
      <div className="page-intro">
        <span className="eyebrow">Customer Dashboard</span>
        <h1>Orders &amp; Returns</h1>
        <p>Track current orders, inspect previous purchases, and easily re-order your favorites.</p>
      </div>

      {orders.length > 0 ? (
        <div className="orders-list-wrapper">
          <div className="orders-header-bar">
            <span>
              Total Orders: <strong>{orders.length}</strong>
            </span>
            <Link href="/products" className="button button-secondary">
              Browse More Products
            </Link>
          </div>

          <div className="orders-cards-list">
            {orders.map((order) => {
              const formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <article className="content-card order-history-card" key={order.id}>
                  <div className="order-history-header">
                    <div className="order-meta-group">
                      <div className="meta-col">
                        <small>Order Placed</small>
                        <strong>{formattedDate}</strong>
                      </div>
                      <div className="meta-col">
                        <small>Total</small>
                        <strong className="order-total-text">৳{order.total.toLocaleString()}</strong>
                      </div>
                      <div className="meta-col">
                        <small>Ship To</small>
                        <strong>{order.customer.name}</strong>
                      </div>
                      <div className="meta-col">
                        <small>Payment</small>
                        <span>{order.customer.payment}</span>
                      </div>
                    </div>

                    <div className="order-id-group">
                      <span className={`status-pill status-${order.status.toLowerCase()}`}>
                        ● {order.status}
                      </span>
                      <span className="order-id-text">#{order.id}</span>
                    </div>
                  </div>

                  <div className="order-history-body">
                    <div
                      className="order-delivery-status-banner"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedOrderForTracking(order)}
                      title="Click to open live tracking map and status"
                    >
                      <span className="truck-icon" style={{ display: "flex", alignItems: "center" }}>
                        <Truck size={18} aria-hidden="true" />
                      </span>
                      <div style={{ flex: 1 }}>
                        <strong>Estimated Delivery: {order.estimatedDelivery}</strong>
                        <small>Delivering to: {order.customer.address}, {order.customer.city}</small>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)", textDecoration: "underline" }}>
                        Live Map &rarr;
                      </span>
                    </div>

                    <div className="order-items-table">
                      {order.items.map((item) => (
                        <div className="order-item-line" key={item.slug}>
                          <Link href={`/product/${item.slug}`}>
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={50}
                              height={50}
                              referrerPolicy="no-referrer"
                              className="order-item-thumb"
                              style={{ objectFit: "cover", borderRadius: 4 }}
                            />
                          </Link>
                          <div className="order-item-desc">
                            <h4>
                              <Link href={`/product/${item.slug}`}>{item.name}</Link>
                            </h4>
                            <span className="order-item-pricing">
                              ৳{item.price.toLocaleString()} × {item.quantity}
                            </span>
                          </div>
                          <div className="order-item-subtotal">
                            ৳{(item.price * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="order-history-footer">
                      <button
                        type="button"
                        className="button button-track-order"
                        onClick={() => setSelectedOrderForTracking(order)}
                      >
                        <span className="radar-dot" />
                        <MapPin size={15} aria-hidden="true" style={{ marginRight: 4, display: "inline-block" }} />
                        Live Track Package
                      </button>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => handleBuyAgain(order)}
                      >
                        <RotateCcw size={15} aria-hidden="true" style={{ marginRight: 4, display: "inline-block" }} />
                        Buy Again
                      </button>
                      <Link
                        href={`/order-confirmation?orderId=${order.id}`}
                        className="button button-secondary"
                      >
                        View Order Details &amp; Receipt
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state orders-empty-state">
          <div className="empty-icon" style={{ display: "flex", justifyContent: "center" }}>
            <Package size={48} className="text-slate-300 stroke-1" aria-hidden="true" />
          </div>
          <h2>No orders placed yet</h2>
          <p>
            When you complete an order on Arozao, you can track its progress, view receipts, and easily re-order items from this page.
          </p>
          <div className="empty-actions">
            <Link href="/products" className="button button-primary">
              Start Shopping
            </Link>
            <Link href="/wishlist" className="button button-secondary">
              View Wishlist
            </Link>
          </div>
        </div>
      )}

      {/* Real-time Order Tracking Modal */}
      <OrderTrackingModal
        order={selectedOrderForTracking}
        onClose={() => setSelectedOrderForTracking(null)}
      />
    </main>
  );
}
