"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthAccessToken } from "@/lib/auth";
import { SellerOrderItem } from "@/types/seller";

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<SellerOrderItem | null>(
    null
  );
  const [courierPartner, setCourierPartner] = useState("Arozao Express");
  const [trackingCode, setTrackingCode] = useState("");

  const loadSellerOrders = useCallback(async () => {
    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/seller/orders", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !Array.isArray(data.orders)) {
        throw new Error(data?.error || "Failed to load seller orders.");
      }
      setOrders(data.orders);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to load seller orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSellerOrders();
  }, [loadSellerOrders]);

  const handleUpdateStatus = async (
    id: string,
    newStatus: SellerOrderItem["fulfillmentStatus"],
    extra?: { courierPartner?: string; trackingCode?: string }
  ) => {
    setErrorMsg("");
    setNotice("");

    if (newStatus !== "Packed") {
      setErrorMsg(
        "Delivery and cancellation updates are managed by the courier or marketplace."
      );
      return;
    }

    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/seller/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          subOrderId: id,
          fulfillmentStatus: newStatus,
          courierPartner: extra?.courierPartner,
          trackingCode: extra?.trackingCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || "Failed to update fulfillment status.");
        await loadSellerOrders();
        return;
      }
      setNotice(`Sub-order updated to "${newStatus}".`);
      setTimeout(() => setNotice(""), 3000);
      await loadSellerOrders();
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Network error updating the parcel status."
      );
      await loadSellerOrders();
    }
  };

  const filtered = orders.filter((o) => {
    const matchesTab =
      filter === "all"
        ? true
        : filter === "In Transit"
        ? o.fulfillmentStatus === "Packed" ||
          o.fulfillmentStatus === "Handed to Courier" ||
          o.fulfillmentStatus === "In Transit"
        : o.fulfillmentStatus === filter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.productName.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerCity.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <span className="badge rounded-pill bg-primary-subtle text-primary mb-2">Logistics &amp; Dispatch</span>
          <h1 className="h3 fw-bold mb-2">Marketplace Orders ({orders.length})</h1>
          <p className="text-secondary mb-0">
            Manage your store sub-orders and prepare parcels for Arozao Express
            doorstep courier collection.
          </p>
        </div>
      </div>

      {notice && (
        <div className="alert alert-success rounded-3 mb-3" role="status">
          ✓ {notice}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="d-flex flex-nowrap gap-2 overflow-x-auto py-2 mb-3">
        {[
          { id: "all", label: `All Orders (${orders.length})` },
          {
            id: "Pending Dispatch",
            label: `Pending Dispatch (${
              orders.filter((o) => o.fulfillmentStatus === "Pending Dispatch")
                .length
            })`,
          },
          {
            id: "In Transit",
            label: `In Transit / With Rider (${
              orders.filter(
                (o) =>
                  o.fulfillmentStatus === "Packed" ||
                  o.fulfillmentStatus === "Handed to Courier" ||
                  o.fulfillmentStatus === "In Transit"
              ).length
            })`,
          },
          {
            id: "Delivered",
            label: `Delivered (${
              orders.filter((o) => o.fulfillmentStatus === "Delivered").length
            })`,
          },
          {
            id: "Cancelled",
            label: `Cancelled (${
              orders.filter((o) => o.fulfillmentStatus === "Cancelled").length
            })`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`btn btn-sm text-nowrap ${
              filter === tab.id ? "btn-primary" : "btn-outline-secondary"
            }`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-3 p-3 mb-3">
        <input
          type="text"
          placeholder="Search by sub-order number, product, customer, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-control"
        />
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle text-nowrap mb-0">
            <thead>
              <tr>
                <th>Sub-Order Reference</th>
                <th>Products &amp; Quantities</th>
                <th>Customer &amp; Destination</th>
                <th>Gross / Net Payable</th>
                <th>Payment Mode</th>
                <th>Fulfillment Status</th>
                <th>Courier Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-secondary">
                    Loading your assigned store sub-orders...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-secondary">
                    No marketplace sub-orders found in this category.
                  </td>
                </tr>
              ) : (
                filtered.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <strong>{ord.orderNumber}</strong>
                      {ord.parentOrderNumber && (
                        <>
                          <br />
                          <small className="text-secondary">
                            Order: {ord.parentOrderNumber}
                          </small>
                        </>
                      )}
                      <br />
                      <small>{ord.orderDate}</small>
                    </td>
                    <td>
                      <div>{ord.productName}</div>
                      {ord.courierPartner && (
                        <small className="text-primary">
                          Courier: {ord.courierPartner}
                          {ord.trackingCode ? ` (${ord.trackingCode})` : ""}
                        </small>
                      )}
                    </td>
                    <td>
                      <strong>{ord.customerCity}</strong>
                      <br />
                      <small>{ord.customerName}</small>
                      {ord.shippingAddress && (
                        <>
                          <br />
                          <small className="text-secondary">
                            {ord.shippingAddress}
                          </small>
                        </>
                      )}
                    </td>
                    <td>
                      <strong>৳{ord.amount.toLocaleString()}</strong>
                      {ord.netSellerPayable !== undefined && (
                        <>
                          <br />
                          <small className="text-success fw-semibold">
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
                            : ord.fulfillmentStatus === "Packed"
                            ? "bg-info-subtle text-info"
                            : ord.fulfillmentStatus === "Handed to Courier" ||
                              ord.fulfillmentStatus === "In Transit"
                            ? "bg-primary-subtle text-primary"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        {ord.fulfillmentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {ord.fulfillmentStatus === "Pending Dispatch" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setSelectedOrder(ord);
                                setCourierPartner(
                                  ord.courierPartner || "Arozao Express"
                                );
                                setTrackingCode(
                                  ord.trackingCode ||
                                    `ARZ-TRK-${ord.orderNumber.slice(-6)}`
                                );
                              }}
                            >
                              📦 Prepare for Pickup
                            </button>
                          </>
                        )}
                        {ord.fulfillmentStatus === "Packed" && (
                          <span className="small text-secondary">
                            Awaiting courier pickup
                          </span>
                        )}
                        {(ord.fulfillmentStatus === "Handed to Courier" ||
                          ord.fulfillmentStatus === "In Transit") && (
                          <span className="small text-secondary">
                            Awaiting courier delivery update
                          </span>
                        )}
                        {ord.fulfillmentStatus === "Delivered" && (
                          <span className="badge rounded-pill bg-success-subtle text-success">
                            ✓ Completed
                          </span>
                        )}
                        {ord.fulfillmentStatus === "Cancelled" && (
                          <span className="badge rounded-pill bg-danger-subtle text-danger">
                            ✕ Cancelled
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch / Courier Tracking Modal */}
      {selectedOrder && (
        <div
          className="modal d-block bg-dark bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispatch-order-title"
          tabIndex={-1}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title fs-5 fw-bold" id="dispatch-order-title">
                  Prepare Sub-Order {selectedOrder.orderNumber}
                </h2>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setSelectedOrder(null)}
                />
              </div>
              <div className="modal-body">
              <p className="small text-secondary mb-3">
                Save the pickup partner and tracking details. The parcel will
                be marked packed and wait for courier pickup.
              </p>

            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor="courier-name">Logistics Courier Partner</label>
              <select
                id="courier-name"
                className="form-select"
                value={courierPartner}
                onChange={(e) => setCourierPartner(e.target.value)}
              >
                <option value="Arozao Express">Arozao Express</option>
                <option value="Pathao Courier">Pathao Courier</option>
                <option value="Steadfast Courier">Steadfast Courier</option>
                <option value="RedX Logistics">RedX Logistics</option>
                <option value="Paperfly">Paperfly</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor="tracking-code">Courier Tracking Code</label>
              <input
                id="tracking-code"
                className="form-control"
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="e.g. ARZ-TRK-984102"
              />
            </div>

              </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setSelectedOrder(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  const ordId = selectedOrder.id;
                  setSelectedOrder(null);
                  await handleUpdateStatus(ordId, "Packed", {
                    courierPartner,
                    trackingCode,
                  });
                }}
              >
                Save &amp; Mark Packed
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
