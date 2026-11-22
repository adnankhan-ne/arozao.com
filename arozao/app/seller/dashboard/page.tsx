"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { getAuthAccessToken } from "@/lib/auth";
import { SellerOrderItem, SellerProductItem } from "@/types/seller";
import DailySalesRevenueChart, {
  DailySalesPoint,
} from "@/components/seller/DailySalesRevenueChart";
import OrderFulfillmentTimeWidget from "@/components/seller/OrderFulfillmentTimeWidget";

export default function SellerDashboardPage() {
  const [storeName, setStoreName] = useState("Merchant Store");
  const [products, setProducts] = useState<SellerProductItem[]>([]);
  const [orders, setOrders] = useState<SellerOrderItem[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailySalesPoint[]>([]);
  const [loadError, setLoadError] = useState("");
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStockProducts: 0,
    lowStockCount: 0,
    totalOrders: 0,
    pendingDispatchCount: 0,
    inTransitCount: 0,
    completedOrdersCount: 0,
    cancelledOrdersCount: 0,
    grossRevenue: 0,
    netEarnings: 0,
    pendingEarnings: 0,
    availablePayoutBalance: 0,
    processingPayoutBalance: 0,
    paidOutBalance: 0,
  });
  const [compliance, setCompliance] = useState({
    nidVerified: false,
    tradeComplianceActive: false,
    settlementAccountLinked: false,
    ownerLegalName: "",
    maskedNid: "",
    payoutAccountLabel: "Verified Account",
  });

  const loadDashboard = useCallback(async () => {
    setLoadError("");
    try {
      const token = getAuthAccessToken();
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const dashRes = await fetch("/api/seller/dashboard", {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      const data = await dashRes.json();
      if (!dashRes.ok || !data?.ok) {
        setLoadError(data?.error || "Unable to load seller dashboard data.");
        return;
      }

      if (data.seller?.storeName) setStoreName(data.seller.storeName);
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.orders)) setOrders(data.orders);
      if (Array.isArray(data.dailyTrend)) setDailyTrend(data.dailyTrend);
      if (data.metrics) {
        setMetrics({
          totalProducts: Number(data.metrics.totalProducts ?? 0),
          activeProducts: Number(data.metrics.activeProducts ?? 0),
          outOfStockProducts: Number(data.metrics.outOfStockProducts ?? 0),
          lowStockCount: Number(data.metrics.lowStockCount ?? 0),
          totalOrders: Number(data.metrics.totalOrders ?? 0),
          pendingDispatchCount: Number(data.metrics.pendingDispatchCount ?? 0),
          inTransitCount: Number(data.metrics.inTransitCount ?? 0),
          completedOrdersCount: Number(
            data.metrics.completedOrdersCount ?? 0
          ),
          cancelledOrdersCount: Number(data.metrics.cancelledOrdersCount ?? 0),
          grossRevenue: Number(data.metrics.grossRevenue ?? 0),
          netEarnings: Number(data.metrics.netEarnings ?? 0),
          pendingEarnings: Number(data.metrics.pendingEarnings ?? 0),
          availablePayoutBalance: Number(
            data.metrics.availablePayoutBalance ?? 0
          ),
          processingPayoutBalance: Number(
            data.metrics.processingPayoutBalance ?? 0
          ),
          paidOutBalance: Number(data.metrics.paidOutBalance ?? 0),
        });
      }
      if (data.compliance) setCompliance(data.compliance);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load seller dashboard data."
      );
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleMarkAsReady = async (orderId: string) => {
    try {
      const token = getAuthAccessToken();
      const response = await fetch("/api/seller/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          subOrderId: orderId,
          fulfillmentStatus: "Packed",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        setLoadError(data?.error || "Failed to mark the parcel as packed.");
        return;
      }
      await loadDashboard();
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Network error marking the parcel as packed."
      );
    }
  };

  return (
    <div className="container-fluid p-0">
      {loadError && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          {loadError}
        </div>
      )}
      {/* Welcome Banner */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4 p-4 p-lg-5">
          <div>
            <span className="badge rounded-pill bg-primary-subtle text-primary mb-2">
              Merchant Overview
            </span>
            <h1 className="h3 fw-bold mb-2">{storeName} — Seller Center</h1>
            <p className="text-secondary mb-0">
            Here is your store summary, parcel fulfillment queue, and recent
            settlements across Bangladesh.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link href="/seller/products/add" className="btn btn-primary">
              Add New Product
            </Link>
            <Link href="/seller/store" className="btn btn-outline-secondary">
              View Store
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xxl">
          <div className="card h-100 border-0 shadow-sm rounded-4"><div className="card-body d-flex align-items-center gap-3">
            <span className="rounded-3 bg-success-subtle text-success p-3">৳</span>
            <div><small className="text-secondary">Total Sales (Gross / Net)</small><strong className="d-block fs-5 fw-bold">৳{metrics.grossRevenue.toLocaleString()}</strong><span className="small text-success">Net Earnings: ৳{metrics.netEarnings.toLocaleString()}</span></div>
          </div></div>
        </div>
        <div className="col-12 col-sm-6 col-xxl">
          <div className="card h-100 border-0 shadow-sm rounded-4"><div className="card-body d-flex align-items-center gap-3">
            <span className="rounded-3 bg-primary-subtle text-primary p-3">📦</span>
            <div><small className="text-secondary">Total Orders</small><strong className="d-block fs-5 fw-bold">{metrics.totalOrders}</strong><span className="small text-secondary">{metrics.completedOrdersCount} delivered · {metrics.cancelledOrdersCount} cancelled</span></div>
          </div></div>
        </div>
        <div className="col-12 col-sm-6 col-xxl">
          <div className="card h-100 border-0 shadow-sm rounded-4"><div className="card-body d-flex align-items-center gap-3">
            <span className="rounded-3 bg-warning-subtle text-warning p-3">🏷️</span>
            <div><small className="text-secondary">Catalog ({metrics.totalProducts} Total)</small><strong className="d-block fs-5 fw-bold">{metrics.activeProducts} Active</strong><span className="small text-secondary">{metrics.outOfStockProducts} out of stock · {metrics.lowStockCount} low stock</span></div>
          </div></div>
        </div>
        <div className="col-12 col-sm-6 col-xxl">
          <div className="card h-100 border-0 shadow-sm rounded-4"><div className="card-body d-flex align-items-center gap-3">
            <span className="rounded-3 bg-warning-subtle text-warning p-3">🛵</span>
            <div><small className="text-secondary">Pending Dispatch</small><strong className="d-block fs-5 fw-bold text-warning">{metrics.pendingDispatchCount} Parcels</strong><span className="small text-secondary">{metrics.inTransitCount} in transit</span></div>
          </div></div>
        </div>
        <div className="col-12 col-sm-6 col-xxl">
          <div className="card h-100 border-0 shadow-sm rounded-4"><div className="card-body d-flex align-items-center gap-3">
            <span className="rounded-3 bg-success-subtle text-success p-3">🏦</span>
            <div><small className="text-secondary">Available Payout Balance</small><strong className="d-block fs-5 fw-bold text-success">৳{metrics.availablePayoutBalance.toLocaleString()}</strong><span className="small text-secondary">Pending clearance: ৳{metrics.pendingEarnings.toLocaleString()}</span></div>
          </div></div>
        </div>
      </div>

      {/* Layout Split: Chart & Quick Actions */}
      <div className="row g-3 mb-4">
        {/* Daily Sales Revenue Chart (Recharts) */}
        <div className="col-12 col-xl-8">
          <div className="card h-100 border-0 shadow-sm rounded-4 p-3">
            <DailySalesRevenueChart data={dailyTrend} />
          </div>
        </div>

        {/* Store Verification & Status */}
        <div className="col-12 col-xl-4">
          <div className="card h-100 border-0 shadow-sm rounded-4"><div className="card-body">
          <h2 className="h5 fw-bold mb-3">Store Compliance Status</h2>
          <div className="vstack gap-3">
            <div className="d-flex align-items-start gap-2">
              <span className="badge rounded-pill bg-success-subtle text-success">
                {compliance.nidVerified ? "✓" : "•"}
              </span>
              <div className="d-flex flex-column">
                <strong className="small">National Identity (NID) Verified</strong>
                <small className="text-secondary">
                  {compliance.ownerLegalName
                    ? `${compliance.ownerLegalName} (${compliance.maskedNid})`
                    : "Verified Merchant Identity"}
                </small>
              </div>
            </div>

            <div className="d-flex align-items-start gap-2">
              <span className="badge rounded-pill bg-success-subtle text-success">
                {compliance.tradeComplianceActive ? "✓" : "•"}
              </span>
              <div className="d-flex flex-column">
                <strong className="small">Trade Compliance Active</strong>
                <small className="text-secondary">Approved for Bangladesh Marketplace</small>
              </div>
            </div>

            <div className="d-flex align-items-start gap-2">
              <span className="badge rounded-pill bg-success-subtle text-success">
                {compliance.settlementAccountLinked ? "✓" : "•"}
              </span>
              <div className="d-flex flex-column">
                <strong className="small">Settlement Account Linked</strong>
                <small className="text-secondary">{compliance.payoutAccountLabel}</small>
              </div>
            </div>

            <div className="d-flex align-items-start gap-2">
              <span className="badge rounded-pill bg-success-subtle text-success">✓</span>
              <div className="d-flex flex-column">
                <strong className="small">Arozao Express Logistics Active</strong>
                <small className="text-secondary">Nationwide 64-district doorstep courier</small>
              </div>
            </div>
          </div>

          <div className="rounded-3 bg-light p-3 mt-4">
            <strong className="small">Need help with product listing or courier pickup?</strong>
            <p className="small text-secondary mt-2">
              Our merchant partner desk is available to assist with catalog and
              settlement inquiries.
            </p>
            <a
              href="tel:+8809612276926"
              className="btn btn-outline-secondary w-100"
            >
              Contact Partner Support
            </a>
          </div>
          </div></div>
        </div>
      </div>

      {/* Average Order Fulfillment Time & Operational Bottleneck Radar (Recharts) */}
      <OrderFulfillmentTimeWidget orders={orders} />

      {/* Recent Orders Section */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
          <div>
            <h2 className="h5 fw-bold mb-1">Recent Marketplace Orders</h2>
            <p className="small text-secondary mb-0">
              Orders placed by Arozao shoppers across Bangladesh for your store.
            </p>
          </div>
          <Link href="/seller/orders" className="btn btn-sm btn-outline-primary">
            View All Orders &rarr;
          </Link>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle text-nowrap mb-0">
            <thead>
              <tr>
                <th>Order Reference</th>
                <th>Product</th>
                <th>Destination</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Fulfillment Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-secondary">
                    No recent sub-orders assigned to your store yet.
                  </td>
                </tr>
              ) : (
                orders.slice(0, 8).map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <strong>{ord.orderNumber}</strong>
                      <br />
                      <small>{ord.orderDate}</small>
                    </td>
                    <td>{ord.productName}</td>
                    <td>
                      {ord.customerCity}
                      <br />
                      <small>{ord.customerName}</small>
                    </td>
                    <td>
                      <strong>৳{ord.amount.toLocaleString()}</strong>
                      {ord.netSellerPayable !== undefined && (
                        <>
                          <br />
                          <small className="text-success">
                            Net: ৳{ord.netSellerPayable.toLocaleString()}
                          </small>
                        </>
                      )}
                    </td>
                    <td>
                      <span className="badge rounded-pill bg-light text-secondary">
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge rounded-pill ${
                          ord.fulfillmentStatus === "Delivered"
                            ? "bg-success-subtle text-success"
                            :                             ord.fulfillmentStatus === "Packed" ||
                            ord.fulfillmentStatus === "Handed to Courier" ||
                              ord.fulfillmentStatus === "In Transit"
                            ? "bg-primary-subtle text-primary"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        ● {ord.fulfillmentStatus}
                      </span>
                    </td>
                    <td>
                      {ord.fulfillmentStatus === "Pending Dispatch" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleMarkAsReady(ord.id)}
                          title="Mark package as ready for Arozao courier pickup"
                        >
                          Mark Packed
                        </button>
                      ) : (
                        <span className="badge rounded-pill bg-primary-subtle text-primary">Packed · awaiting pickup</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {/* Recent Products Section */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
          <div>
            <h2 className="h5 fw-bold mb-1">Recent Store Products</h2>
            <p className="small text-secondary mb-0">
              Live inventory, pricing, and sales velocity for your catalog
              items.
            </p>
          </div>
          <Link href="/seller/products" className="btn btn-sm btn-outline-primary">
            Manage All Products &rarr;
          </Link>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle text-nowrap mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Available Stock</th>
                <th>Units Sold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-secondary">
                    No products published in your store yet.
                  </td>
                </tr>
              ) : (
                products.slice(0, 6).map((prod) => (
                  <tr key={prod.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Image
                          src={prod.image}
                          alt={prod.name}
                          width={44}
                          height={44}
                          referrerPolicy="no-referrer"
                          className="rounded-2 object-fit-cover"
                        />
                        <div>
                          <strong>{prod.name}</strong>
                          <small className="d-block text-secondary">Created: {prod.createdAt}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code>{prod.sku}</code>
                    </td>
                    <td>
                      <span className="badge rounded-pill bg-light text-secondary">{prod.category}</span>
                    </td>
                    <td>
                      <strong>৳{prod.price.toLocaleString()}</strong>
                    </td>
                    <td>
                      {prod.stock === 0 ? (
                        <span className="text-danger fw-bold">
                          Out of Stock (0)
                        </span>
                      ) : (
                        <span>{prod.stock} units</span>
                      )}
                    </td>
                    <td>{prod.salesCount} sold</td>
                    <td>
                      <span
                        className={`badge rounded-pill ${
                          prod.status === "active"
                            ? "bg-success-subtle text-success"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        ●{" "}
                        {prod.status === "active"
                          ? "Active"
                          : prod.status === "out-of-stock"
                          ? "Out of Stock"
                          : prod.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}
