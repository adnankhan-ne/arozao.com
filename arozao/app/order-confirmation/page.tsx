"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  fetchCustomerOrdersFromApi,
  fetchOrderByIdFromApi,
  getOrderById,
} from "@/lib/orders";
import { Order } from "@/types";

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="site-content">
          <div className="empty-state">
            <p>Loading your order details...</p>
          </div>
        </main>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      if (orderId) {
        const cached = getOrderById(orderId);
        if (cached && active) {
          setOrder(cached);
        }
        const fetched = await fetchOrderByIdFromApi(orderId);
        if (active && fetched) {
          setOrder(fetched);
        }
      } else {
        const recent = await fetchCustomerOrdersFromApi();
        if (active && recent.length > 0) {
          setOrder(recent[0]);
        }
      }
      if (active) {
        setLoading(false);
      }
    }

    void loadOrder();
    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <p>Loading your order details...</p>
        </div>
      </main>
    );
  }


  return (
    <main className="site-content confirmation-page-content">
      <div className="confirmation-card content-card">
        <div className="confirmation-header">
          <div className="confirmation-icon-circle">✓</div>
          <span className="eyebrow">Order Confirmed</span>
          <h1>Thank You for Your Order!</h1>
          <p className="confirmation-intro-text">
            We have received your order and our team is preparing it for shipment.
          </p>
          {order && (
            <div className="order-id-pill">
              Order Reference: <strong>#{order.id}</strong>
            </div>
          )}
        </div>

        {order ? (
          <div className="confirmation-body">
            {/* Status Timeline */}
            <div className="order-timeline-box">
              <h3>Order Status: {order.status}</h3>
              <div className="order-timeline">
                <div className="timeline-step is-complete">
                  <div className="timeline-bullet">✓</div>
                  <span className="timeline-label">Order Placed</span>
                </div>
                <div className="timeline-step is-current">
                  <div className="timeline-bullet">⚡</div>
                  <span className="timeline-label">Processing</span>
                </div>
                <div className="timeline-step">
                  <div className="timeline-bullet">🚚</div>
                  <span className="timeline-label">Shipped</span>
                </div>
                <div className="timeline-step">
                  <div className="timeline-bullet">🏠</div>
                  <span className="timeline-label">Delivered</span>
                </div>
              </div>
              <div className="timeline-eta">
                Estimated Delivery: <strong>{order.estimatedDelivery}</strong>
              </div>
            </div>

            {/* Two Column details: Shipping & Itemized Receipt */}
            <div className="confirmation-details-grid">
              {/* Left Column: Delivery & Payment Details */}
              <div className="confirmation-column">
                <h3>Delivery Information</h3>
                <div className="info-block">
                  <div className="info-row">
                    <span className="info-label">Recipient:</span>
                    <span className="info-value">{order.customer.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Phone:</span>
                    <span className="info-value">{order.customer.phone}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Address:</span>
                    <span className="info-value">
                      {order.customer.address}, {order.customer.city}
                    </span>
                  </div>
                  {order.customer.notes && (
                    <div className="info-row">
                      <span className="info-label">Notes:</span>
                      <span className="info-value">{order.customer.notes}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Payment:</span>
                    <span className="info-value">{order.customer.payment}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Ordered Items */}
              <div className="confirmation-column">
                <h3>Ordered Items ({order.items.reduce((s, i) => s + i.quantity, 0)})</h3>
                <div className="receipt-items-list">
                  {order.items.map((item) => (
                    <div className="receipt-item-row" key={item.slug}>
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={48}
                        height={48}
                        referrerPolicy="no-referrer"
                        className="receipt-item-img"
                        style={{ objectFit: "cover", borderRadius: 4 }}
                      />
                      <div className="receipt-item-info">
                        <Link href={`/product/${item.slug}`} className="receipt-item-name">
                          {item.name}
                        </Link>
                        <small className="receipt-item-meta">
                          ৳{item.price.toLocaleString()} × {item.quantity}
                        </small>
                      </div>
                      <span className="receipt-item-subtotal">
                        ৳{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <hr className="summary-divider" />

                <div className="receipt-totals-box">
                  <div className="summary-line">
                    <span>Subtotal</span>
                    <strong>৳{order.subtotal.toLocaleString()}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Delivery Fee</span>
                    <strong>{order.deliveryFee === 0 ? "FREE" : `৳${order.deliveryFee}`}</strong>
                  </div>
                  <hr className="summary-divider" />
                  <div className="summary-line total-line">
                    <span>Grand Total</span>
                    <strong className="grand-total">৳{order.total.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="confirmation-actions">
              <Link href={`/orders?track=${order.id}`} className="button button-track-order">
                <span className="radar-dot" /> 📍 Live Track Package
              </Link>
              <Link href="/orders" className="button button-primary">
                📦 View in Order History
              </Link>
              <Link href="/products" className="button button-secondary">
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="no-order-fallback">
            <p>No recent order found on this device.</p>
            <Link href="/products" className="button button-primary">
              Explore Store
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
