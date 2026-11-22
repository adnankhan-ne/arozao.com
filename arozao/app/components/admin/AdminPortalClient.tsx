"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SellerApplication, ApplicationStatus } from "@/types/seller";
import {
  fetchSellerApplicationsFromServer,
  updateSellerApplicationStatusOnServer,
} from "@/lib/seller";
import {
  fetchCurrentProfile,
  getAuthAccessToken,
  SessionUser,
} from "@/lib/auth";
import AdminOverview from "@/components/admin/AdminOverview";

export type AdminSection =
  | "overview"
  | "applications"
  | "stores"
  | "orders"
  | "products"
  | "payouts"
  | "customers"
  | "categories"
  | "brands"
  | "coupons"
  | "commissions"
  | "audit-logs";

interface AdminPortalClientProps {
  initialSection?: AdminSection;
}

export default function AdminPortalClient({
  initialSection = "overview",
}: AdminPortalClientProps) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [activeSection, setActiveSection] =
    useState<AdminSection>(initialSection);

  // Seller Applications state
  const [apps, setApps] = useState<SellerApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Platform Overview & Extended Admin Data state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [overviewData, setOverviewData] = useState<any>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [productSearch, setProductSearch] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("search") || ""
  );
  const [productStatusFilter, setProductStatusFilter] = useState("all");

  // Coupon creation state
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscountType, setNewCouponDiscountType] = useState<
    "percentage" | "fixed"
  >("percentage");
  const [newCouponValue, setNewCouponValue] = useState("10");
  const [newCouponMinOrder, setNewCouponMinOrder] = useState("500");

  // Category & Brand creation state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryRate, setNewCategoryRate] = useState("10");
  const [newBrandName, setNewBrandName] = useState("");

  // Commission rule creation state
  const [newRuleRate, setNewRuleRate] = useState("8");
  const [newRuleCategoryId, setNewRuleCategoryId] = useState("");

  // Payout reference input map
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const handlePanelSearch = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const query = (event as CustomEvent<{ query?: string }>).detail?.query;
      if (typeof query === "string") setProductSearch(query);
    };

    window.addEventListener("arozao-panel-search", handlePanelSearch);
    return () =>
      window.removeEventListener("arozao-panel-search", handlePanelSearch);
  }, []);

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadAdminOverview = useCallback(async () => {
    const token = getAuthAccessToken();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      const ovRes = await fetch("/api/admin/overview", {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (ovRes.ok) {
        const ovJson = await ovRes.json();
        if (ovJson?.ok) {
          setOverviewData(ovJson);
        }
      }
    } catch {
      // Ignore network errors
    }
  }, []);

  const loadApplications = useCallback(async () => {
    const list = await fetchSellerApplicationsFromServer();
    setApps(list);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function verifyAdminAndLoad() {
      const verified = await fetchCurrentProfile();
      if (cancelled) return;

      if (!verified) {
        setAuthChecked(true);
        router.replace("/login?redirect=/admin");
        return;
      }

      if (verified.role !== "super_admin" && verified.role !== "admin") {
        setAccessDenied(true);
        setAuthChecked(true);
        return;
      }

      setAdminUser(verified);
      setAuthChecked(true);

      await Promise.all([loadApplications(), loadAdminOverview()]);
    }

    void verifyAdminAndLoad();

    return () => {
      cancelled = true;
    };
  }, [router, loadApplications, loadAdminOverview]);

  if (!authChecked) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <p>Verifying Admin Governance privileges...</p>
        </div>
      </main>
    );
  }

  if (accessDenied || !adminUser) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <h1>403 — Access Denied</h1>
          <p>
            This private area requires verified Super Admin or Administrator
            privileges.
          </p>
          <Link href="/" className="button button-primary">
            Return to Storefront
          </Link>
        </div>
      </main>
    );
  }

  const handleQuickAction = async (
    applicationId: string,
    newStatus: ApplicationStatus,
    defaultNote: string
  ) => {
    setErrorMsg("");
    const result = await updateSellerApplicationStatusOnServer(
      applicationId,
      newStatus,
      {
        reviewerNotes: defaultNote,
        actionRequiredNote:
          newStatus === "Action Required" ? defaultNote : undefined,
        rejectionReason: newStatus === "Rejected" ? defaultNote : undefined,
      }
    );

    if (!result.ok) {
      setErrorMsg(result.error || "Failed to update application status.");
      return;
    }

    showNotice(`Application ${applicationId} updated to "${newStatus}".`);
    await Promise.all([loadApplications(), loadAdminOverview()]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const executeAdminMutation = async (payload: Record<string, any>) => {
    setErrorMsg("");
    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/admin/overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || "Admin operation failed.");
        return false;
      }
      showNotice("Admin change saved.");
      await loadAdminOverview();
      return true;
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? `Admin action request failed: ${error.message}`
          : "Network error executing admin action."
      );
      return false;
    }
  };

  const handleAdminPayoutProcess = async (
    payoutId: string,
    newStatus: "Processing" | "Completed" | "Failed"
  ) => {
    setErrorMsg("");
    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/seller/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          action: "admin_process",
          payoutId,
          newStatus,
          referenceNumber:
            payoutRefs[payoutId] ||
            `BEFTN-${new Date().getFullYear()}-${Math.floor(
              100000 + Math.random() * 900000
            )}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || "Payout processing failed.");
        return;
      }
      showNotice(data.message || `Payout updated to ${newStatus}.`);
      await loadAdminOverview();
    } catch {
      setErrorMsg("Network error updating payout.");
    }
  };

  const filteredApps = apps.filter((a) => {
    const matchesStatus =
      statusFilter === "all" ? true : a.status === statusFilter;
    const q = search.trim().toLowerCase();
    const storeName = a.formData.store.storeName.toLowerCase();
    const fullName = a.formData.account.fullName.toLowerCase();
    const email = a.formData.account.email.toLowerCase();
    const mobile = a.formData.account.mobile.toLowerCase();
    const matchesSearch =
      !q ||
      storeName.includes(q) ||
      fullName.includes(q) ||
      a.applicationId.toLowerCase().includes(q) ||
      a.sellerId.toLowerCase().includes(q) ||
      email.includes(q) ||
      mobile.includes(q);
    return matchesStatus && matchesSearch;
  });

  const getBadgeClass = (status: ApplicationStatus) => {
    switch (status) {
      case "Approved":
        return "status-badge status-approved";
      case "Action Required":
        return "status-badge status-action";
      case "Rejected":
      case "Suspended":
        return "status-badge status-rejected";
      default:
        return "status-badge status-review";
    }
  };

  const summary = overviewData?.summary;
  const stores = overviewData?.sellers || [];
  const allProducts = overviewData?.products || [];
  const adminOrders = overviewData?.orders || [];
  const allPayouts = overviewData?.payouts || [];
  const allCustomers = overviewData?.customers || [];
  const allCoupons = overviewData?.coupons || [];
  const allCategories = overviewData?.categories || [];
  const allBrands = overviewData?.brands || [];
  const allCommissionRules = overviewData?.commissionRules || [];
  const allAuditLogs = overviewData?.auditLogs || [];

  const filteredOrders = adminOrders.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (o: any) => {
      const matchesStatus =
        orderStatusFilter === "all" ? true : o.status === orderStatusFilter;
      const q = orderSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(o.order_number || "")
          .toLowerCase()
          .includes(q) ||
        String(o.customer_name || "")
          .toLowerCase()
          .includes(q) ||
        String(o.customer_phone || "")
          .toLowerCase()
          .includes(q);
      return matchesStatus && matchesSearch;
    }
  );

  const filteredProducts = allProducts.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => {
      const matchesStatus =
        productStatusFilter === "all" ? true : p.status === productStatusFilter;
      const q = productSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(p.name || "")
          .toLowerCase()
          .includes(q) ||
        String(p.sku || "")
          .toLowerCase()
          .includes(q) ||
        String(p.sellers?.store_name || "")
          .toLowerCase()
          .includes(q);
      return matchesStatus && matchesSearch;
    }
  );

  return (
    <main className="site-content">
      <div className="admin-portal-shell">
        <div className="admin-panel-page-heading">
          <span className="admin-badge-eyebrow">
            Arozao Marketplace Governance · {adminUser.role.toUpperCase()} (
            {adminUser.email})
          </span>
          <h1>Marketplace analytics &amp; operations</h1>
          <p>
            Track sales performance and manage your marketplace from one place.
          </p>
        </div>

        {/* Summary KPI Strip */}
        {activeSection !== "overview" && (
          <div className="seller-kpi-grid admin-secondary-kpis">
            <div className="seller-kpi-card">
              <div className="kpi-top">
                <span>Pending KYC Review</span>
                <span className="kpi-icon">⏳</span>
              </div>
              <strong>
                {summary?.pendingApplications ??
                  overviewData?.pending_sellers ??
                  apps.filter((a) => a.status === "Under Review").length}
              </strong>
              <small>Requires compliance officer verification</small>
            </div>

            <div className="seller-kpi-card">
              <div className="kpi-top">
                <span>Approved Sellers</span>
                <span className="kpi-icon">✅</span>
              </div>
              <strong>
                {summary?.activeSellers ??
                  overviewData?.active_sellers ??
                  apps.filter((a) => a.status === "Approved").length}
              </strong>
              <small>
                {summary?.totalSellers ??
                  overviewData?.active_sellers ??
                  stores.length}{" "}
                seller stores
              </small>
            </div>

            <div className="seller-kpi-card">
              <div className="kpi-top">
                <span>Platform Gross Revenue</span>
                <span className="kpi-icon">💰</span>
              </div>
              <strong>
                ৳
                {Number(
                  summary?.grossPlatformRevenue ??
                    summary?.total_gmv ??
                    overviewData?.gmv?.total_gmv ??
                    0
                ).toLocaleString()}
              </strong>
              <small>
                Commission Earned: ৳
                {Number(
                  summary?.totalPlatformCommission ??
                    overviewData?.net_revenue ??
                    0
                ).toLocaleString()}
              </small>
            </div>

            <div className="seller-kpi-card">
              <div className="kpi-top">
                <span>Marketplace Orders</span>
                <span className="kpi-icon">🚚</span>
              </div>
              <strong>
                {summary?.totalOrders ??
                  summary?.total_orders ??
                  overviewData?.gmv?.total_orders ??
                  adminOrders.length}
              </strong>
              <small>
                {summary?.totalProducts ??
                  overviewData?.total_products ??
                  allProducts.length}{" "}
                products · {summary?.totalUsers ?? allCustomers.length} users
              </small>
            </div>
          </div>
        )}

        {toast && <div className="admin-toast-banner">✓ {toast}</div>}
        {errorMsg && (
          <div className="auth-error-banner" style={{ marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        {activeSection === "overview" && (
          <AdminOverview data={overviewData} applications={apps} />
        )}

        {/* SECTION: SELLER KYC APPLICATIONS */}
        {activeSection === "applications" && (
          <>
            <div className="seller-filter-bar">
              <input
                type="text"
                placeholder="Search by store name, applicant, Application ID, Seller ID, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="seller-search-input"
              />

              <div className="seller-filter-tabs" style={{ marginBottom: 0 }}>
                {[
                  { id: "all", label: `All (${apps.length})` },
                  {
                    id: "Under Review",
                    label: `Under Review (${
                      apps.filter((a) => a.status === "Under Review").length
                    })`,
                  },
                  {
                    id: "Action Required",
                    label: `Action Required (${
                      apps.filter((a) => a.status === "Action Required").length
                    })`,
                  },
                  {
                    id: "Approved",
                    label: `Approved (${
                      apps.filter((a) => a.status === "Approved").length
                    })`,
                  },
                  {
                    id: "Rejected",
                    label: `Rejected (${
                      apps.filter((a) => a.status === "Rejected").length
                    })`,
                  },
                  {
                    id: "Suspended",
                    label: `Suspended (${
                      apps.filter((a) => a.status === "Suspended").length
                    })`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`filter-tab-btn ${
                      statusFilter === tab.id ? "is-active" : ""
                    }`}
                    onClick={() => setStatusFilter(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="seller-table-card">
              <div className="orders-table-wrapper">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>Application &amp; Seller ID</th>
                      <th>Store &amp; Category</th>
                      <th>Applicant &amp; Contact</th>
                      <th>Type &amp; NID</th>
                      <th>Payout Method</th>
                      <th>Status</th>
                      <th>Governance Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.map((app) => {
                      const fd = app.formData;
                      const primaryCategory =
                        fd.store.categories[0] || "General";
                      return (
                        <tr key={app.applicationId}>
                          <td>
                            <strong>{app.applicationId}</strong>
                            <br />
                            <small>{app.sellerId}</small>
                          </td>
                          <td>
                            <strong>{fd.store.storeName}</strong>
                            <br />
                            <small>
                              {primaryCategory} · {fd.address.district}
                            </small>
                          </td>
                          <td>
                            <span>{fd.account.fullName}</span>
                            <br />
                            <small>
                              {fd.account.mobile} · {fd.account.email}
                            </small>
                          </td>
                          <td>
                            <span style={{ textTransform: "capitalize" }}>
                              {fd.business.sellerType.replace("_", " ")}
                            </span>
                            <br />
                            <small>NID: {fd.sellerInfo.nidNumber}</small>
                          </td>
                          <td>
                            <strong style={{ textTransform: "uppercase" }}>
                              {fd.payment.paymentType === "bank"
                                ? "BANK"
                                : fd.payment.mfsDetails.provider}
                            </strong>
                            <br />
                            <small>
                              {fd.payment.paymentType === "bank"
                                ? fd.payment.bankDetails.bankName
                                : fd.payment.mfsDetails.walletNumber}
                            </small>
                          </td>
                          <td>
                            <span className={getBadgeClass(app.status)}>
                              {app.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-action-btns">
                              <Link
                                href={`/admin/sellers/${encodeURIComponent(
                                  app.applicationId
                                )}`}
                                className="table-btn"
                              >
                                Inspect KYC
                              </Link>

                              {app.status !== "Approved" && (
                                <button
                                  type="button"
                                  className="table-btn approve-btn"
                                  onClick={() =>
                                    handleQuickAction(
                                      app.applicationId,
                                      "Approved",
                                      "KYC documents, NID, and payout account verified by Arozao Compliance Team."
                                    )
                                  }
                                >
                                  Approve
                                </button>
                              )}

                              {app.status === "Under Review" && (
                                <button
                                  type="button"
                                  className="table-btn"
                                  onClick={() =>
                                    handleQuickAction(
                                      app.applicationId,
                                      "Action Required",
                                      "Please re-upload a clearer scan of your National ID and business verification documents."
                                    )
                                  }
                                >
                                  Request Docs
                                </button>
                              )}

                              {app.status === "Approved" && (
                                <button
                                  type="button"
                                  className="table-btn danger"
                                  onClick={() =>
                                    handleQuickAction(
                                      app.applicationId,
                                      "Suspended",
                                      "Account temporarily suspended pending marketplace compliance review."
                                    )
                                  }
                                >
                                  Suspend
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredApps.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{ textAlign: "center", padding: 28 }}
                        >
                          No seller applications match the current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* SECTION: ACTIVE SELLER STORES */}
        {activeSection === "stores" && (
          <div className="seller-table-card">
            <div className="card-head-row" style={{ padding: "16px 20px 0" }}>
              <div>
                <h3>Seller Stores &amp; Commission Governance</h3>
                <p>
                  Manage store status, verified badges, vacation mode, and
                  custom commission overrides.
                </p>
              </div>
            </div>
            <div className="orders-table-wrapper">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Seller Code</th>
                    <th>Store Name &amp; Slug</th>
                    <th>Business Owner &amp; District</th>
                    <th>Commission Override</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {stores.map((st: any) => {
                    const biz = Array.isArray(st.seller_business_profiles)
                      ? st.seller_business_profiles[0]
                      : st.seller_business_profiles;
                    return (
                      <tr key={st.id}>
                        <td>
                          <strong>{st.seller_code}</strong>
                        </td>
                        <td>
                          <strong>{st.store_name}</strong>
                          <br />
                          <small>/store/{st.store_slug}</small>
                        </td>
                        <td>
                          <span>
                            {biz?.owner_legal_name ||
                              biz?.legal_business_name ||
                              "Verified Merchant"}
                          </span>
                          <br />
                          <small>{biz?.business_district || "Dhaka"}</small>
                        </td>
                        <td>
                          <strong>
                            {st.commission_rate_override !== null &&
                            st.commission_rate_override !== undefined
                              ? `${Number(st.commission_rate_override)}%`
                              : "Default (Category)"}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              st.status === "active"
                                ? "status-approved"
                                : "status-rejected"
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-action-btns">
                            {st.status === "active" ? (
                              <button
                                type="button"
                                className="table-btn danger"
                                onClick={() =>
                                  executeAdminMutation({
                                    entity: "seller_status",
                                    sellerId: st.id,
                                    status: "suspended",
                                  })
                                }
                              >
                                Suspend Store
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="table-btn approve-btn"
                                onClick={() =>
                                  executeAdminMutation({
                                    entity: "seller_status",
                                    sellerId: st.id,
                                    status: "active",
                                    isVerified: true,
                                  })
                                }
                              >
                                Activate Store
                              </button>
                            )}
                            <button
                              type="button"
                              className="table-btn"
                              onClick={() => {
                                const nextRate =
                                  Number(st.commission_rate_override ?? 10) ===
                                  8
                                    ? 5
                                    : 8;
                                void executeAdminMutation({
                                  entity: "seller_status",
                                  sellerId: st.id,
                                  commissionRateOverride: nextRate,
                                });
                              }}
                            >
                              Set{" "}
                              {Number(st.commission_rate_override ?? 10) === 8
                                ? "5%"
                                : "8%"}{" "}
                              Fee
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {stores.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", padding: 24 }}
                      >
                        No seller stores found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION: ALL MARKETPLACE ORDERS */}
        {activeSection === "orders" && (
          <>
            <div className="seller-filter-bar">
              <input
                type="text"
                placeholder="Search by Order Number, customer name, or phone..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="seller-search-input"
              />
              <div className="seller-filter-tabs" style={{ marginBottom: 0 }}>
                {[
                  "all",
                  "Processing",
                  "Packed",
                  "Shipped",
                  "Delivered",
                  "Cancelled",
                ].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`filter-tab-btn ${
                      orderStatusFilter === st ? "is-active" : ""
                    }`}
                    onClick={() => setOrderStatusFilter(st)}
                  >
                    {st === "all" ? `All (${adminOrders.length})` : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="seller-table-card">
              <div className="orders-table-wrapper">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>Order # &amp; Date</th>
                      <th>Customer &amp; Destination</th>
                      <th>Sub-Orders &amp; Items</th>
                      <th>Total &amp; Payment</th>
                      <th>Order Status</th>
                      <th>Admin Order Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {filteredOrders.map((ord: any) => {
                      const subOrders = Array.isArray(ord.sub_orders)
                        ? ord.sub_orders
                        : [];
                      const itemCount = subOrders.reduce(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (acc: number, s: any) =>
                          acc +
                          (Array.isArray(s.order_items)
                            ? s.order_items.length
                            : 0),
                        0
                      );
                      const paymentObj = Array.isArray(ord.payments)
                        ? ord.payments[0]
                        : ord.payments;
                      return (
                        <tr key={ord.id}>
                          <td>
                            <strong>{ord.order_number}</strong>
                            <br />
                            <small>
                              {new Date(ord.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </small>
                          </td>
                          <td>
                            <strong>{ord.customer_name}</strong>
                            <br />
                            <small>
                              {ord.customer_phone} · {ord.shipping_district},{" "}
                              {ord.shipping_division}
                            </small>
                          </td>
                          <td>
                            <span>{itemCount} item(s)</span>
                            <br />
                            <small>
                              {subOrders.length} seller sub-order(s)
                            </small>
                          </td>
                          <td>
                            <strong>
                              ৳
                              {Number(
                                ord.total_payable_amount ?? 0
                              ).toLocaleString()}
                            </strong>
                            <br />
                            <small>
                              {paymentObj?.payment_method || "Cash on delivery"}{" "}
                              · {paymentObj?.status || "Pending"}
                            </small>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${
                                ord.status === "Delivered"
                                  ? "status-approved"
                                  : ord.status === "Cancelled"
                                  ? "status-rejected"
                                  : "status-review"
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-action-btns">
                              {ord.status !== "Delivered" &&
                                ord.status !== "Cancelled" && (
                                  <>
                                    <button
                                      type="button"
                                      className="table-btn"
                                      onClick={() =>
                                        executeAdminMutation({
                                          entity: "order_status",
                                          orderId: ord.id,
                                          status: "Shipped",
                                        })
                                      }
                                    >
                                      Mark Shipped
                                    </button>
                                    <button
                                      type="button"
                                      className="table-btn approve-btn"
                                      onClick={() =>
                                        executeAdminMutation({
                                          entity: "order_status",
                                          orderId: ord.id,
                                          status: "Delivered",
                                        })
                                      }
                                    >
                                      Mark Delivered
                                    </button>
                                    <button
                                      type="button"
                                      className="table-btn danger"
                                      onClick={() =>
                                        executeAdminMutation({
                                          entity: "order_status",
                                          orderId: ord.id,
                                          status: "Cancelled",
                                        })
                                      }
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ textAlign: "center", padding: 24 }}
                        >
                          No marketplace orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* SECTION: PRODUCT & INVENTORY MODERATION */}
        {activeSection === "products" && (
          <>
            <div className="seller-filter-bar">
              <input
                type="text"
                placeholder="Search catalog by product name, SKU, or seller store..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="seller-search-input"
              />
              <div className="seller-filter-tabs" style={{ marginBottom: 0 }}>
                {["all", "active", "out_of_stock", "draft", "suspended"].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      className={`filter-tab-btn ${
                        productStatusFilter === st ? "is-active" : ""
                      }`}
                      onClick={() => setProductStatusFilter(st)}
                    >
                      {st === "all" ? `All (${allProducts.length})` : st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="seller-table-card">
              <div className="orders-table-wrapper">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>Product &amp; SKU</th>
                      <th>Seller Store</th>
                      <th>Sale Price</th>
                      <th>Inventory Stock</th>
                      <th>Status</th>
                      <th>Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {filteredProducts.map((p: any) => {
                      const invRow = Array.isArray(p.product_inventory)
                        ? p.product_inventory[0]
                        : p.product_inventory;
                      const stockQty = Number(invRow?.quantity_available ?? 0);
                      return (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <br />
                            <small>
                              SKU: {p.sku}{" "}
                              {p.is_featured ? "· ⭐ Featured" : ""}
                            </small>
                          </td>
                          <td>
                            <span>
                              {p.sellers?.store_name || "Official Store"}
                            </span>
                            <br />
                            <small>{p.categories?.name || "General"}</small>
                          </td>
                          <td>
                            <strong>
                              ৳
                              {Number(
                                p.sale_price ?? p.regular_price ?? 0
                              ).toLocaleString()}
                            </strong>
                          </td>
                          <td>
                            <strong>{stockQty} units</strong>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${
                                p.status === "active"
                                  ? "status-approved"
                                  : p.status === "suspended"
                                  ? "status-rejected"
                                  : "status-action"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-action-btns">
                              {p.status !== "active" ? (
                                <button
                                  type="button"
                                  className="table-btn approve-btn"
                                  onClick={() =>
                                    executeAdminMutation({
                                      entity: "product_moderation",
                                      productId: p.id,
                                      status: "active",
                                    })
                                  }
                                >
                                  Approve
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="table-btn danger"
                                  onClick={() =>
                                    executeAdminMutation({
                                      entity: "product_moderation",
                                      productId: p.id,
                                      status: "suspended",
                                    })
                                  }
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                type="button"
                                className="table-btn"
                                onClick={() =>
                                  executeAdminMutation({
                                    entity: "product_moderation",
                                    productId: p.id,
                                    isFeatured: !p.is_featured,
                                  })
                                }
                              >
                                {p.is_featured ? "Unfeature" : "Feature"}
                              </button>
                              <button
                                type="button"
                                className="table-btn"
                                onClick={() =>
                                  executeAdminMutation({
                                    entity: "product_moderation",
                                    productId: p.id,
                                    stock: stockQty + 10,
                                  })
                                }
                              >
                                +10 Stock
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* SECTION: SELLER PAYOUTS & SETTLEMENTS */}
        {activeSection === "payouts" && (
          <div className="seller-table-card">
            <div className="card-head-row" style={{ padding: "16px 20px 0" }}>
              <div>
                <h3>Seller Payout Requests &amp; Disbursements</h3>
                <p>
                  Review and settle seller withdrawal batches with BEFTN or MFS
                  transaction references.
                </p>
              </div>
            </div>
            <div className="orders-table-wrapper">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Batch # &amp; Date</th>
                    <th>Seller Store</th>
                    <th>Settlement Amount</th>
                    <th>Bank / MFS Reference</th>
                    <th>Status</th>
                    <th>Finance Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {allPayouts.map((po: any) => (
                    <tr key={po.id}>
                      <td>
                        <strong>{po.payout_batch_number}</strong>
                        <br />
                        <small>
                          {new Date(po.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </small>
                      </td>
                      <td>
                        <strong>
                          {po.sellers?.store_name || "Merchant Store"}
                        </strong>
                        <br />
                        <small>{po.sellers?.seller_code}</small>
                      </td>
                      <td>
                        <strong>
                          ৳{Number(po.amount ?? 0).toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        {po.status === "Completed" ? (
                          <code>
                            {po.bank_or_mfs_reference ||
                              po.payout_batch_number}
                          </code>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter BEFTN / TrxID..."
                            value={
                              payoutRefs[po.id] ??
                              po.bank_or_mfs_reference ??
                              ""
                            }
                            onChange={(e) =>
                              setPayoutRefs((prev) => ({
                                ...prev,
                                [po.id]: e.target.value,
                              }))
                            }
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid var(--color-border)",
                              fontSize: 12,
                            }}
                          />
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            po.status === "Completed"
                              ? "status-approved"
                              : po.status === "Failed"
                              ? "status-rejected"
                              : "status-review"
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-action-btns">
                          {po.status !== "Completed" && (
                            <>
                              <button
                                type="button"
                                className="table-btn approve-btn"
                                onClick={() =>
                                  handleAdminPayoutProcess(po.id, "Completed")
                                }
                              >
                                Mark Disbursed
                              </button>
                              {po.status === "Pending" && (
                                <button
                                  type="button"
                                  className="table-btn"
                                  onClick={() =>
                                    handleAdminPayoutProcess(
                                      po.id,
                                      "Processing"
                                    )
                                  }
                                >
                                  Processing
                                </button>
                              )}
                              <button
                                type="button"
                                className="table-btn danger"
                                onClick={() =>
                                  handleAdminPayoutProcess(po.id, "Failed")
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allPayouts.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", padding: 24 }}
                      >
                        No seller payout records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION: CUSTOMERS */}
        {activeSection === "customers" && (
          <div className="seller-table-card">
            <div className="card-head-row" style={{ padding: "16px 20px 0" }}>
              <div>
                <h3>Registered Marketplace Accounts</h3>
                <p>
                  Directory of authenticated users and roles stored in Supabase.
                </p>
              </div>
            </div>
            <div className="orders-table-wrapper">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Mobile</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {allCustomers.map((u: any) => {
                    const prof = Array.isArray(u.user_profiles)
                      ? u.user_profiles[0]
                      : u.user_profiles;
                    return (
                      <tr key={u.id}>
                        <td>
                          <strong>
                            {prof?.full_name || u.email.split("@")[0]}
                          </strong>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || "—"}</td>
                        <td>
                          <span
                            className="status-badge status-review"
                            style={{ textTransform: "uppercase" }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              u.is_active
                                ? "status-approved"
                                : "status-rejected"
                            }`}
                          >
                            {u.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td>
                          {u.id !== adminUser.id && (
                            <button
                              type="button"
                              className={`table-btn ${
                                u.is_active ? "danger" : "approve-btn"
                              }`}
                              onClick={() =>
                                executeAdminMutation({
                                  entity: "customer_status",
                                  userId: u.id,
                                  isActive: !u.is_active,
                                })
                              }
                            >
                              {u.is_active ? "Suspend" : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {allCustomers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", padding: 24 }}
                      >
                        No user profiles found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION: CATEGORIES */}
        {activeSection === "categories" && (
          <div className="seller-table-card" style={{ padding: 20 }}>
            <h3>Marketplace Categories ({allCategories.length})</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCategoryName.trim()) return;
                const ok = await executeAdminMutation({
                  entity: "category",
                  name: newCategoryName,
                  defaultCommissionRate: Number(newCategoryRate || 10),
                });
                if (ok) setNewCategoryName("");
              }}
              style={{
                display: "flex",
                gap: 10,
                marginTop: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="New Category Name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                style={{ flex: 2, minWidth: 200 }}
                required
              />
              <input
                type="number"
                placeholder="Default Commission %"
                value={newCategoryRate}
                onChange={(e) => setNewCategoryRate(e.target.value)}
                style={{ width: 160 }}
              />
              <button type="submit" className="button button-primary">
                + Save Category
              </button>
            </form>

            <table className="seller-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Slug</th>
                  <th>Default Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {allCategories.map((cat: any) => (
                  <tr key={cat.id}>
                    <td>
                      <strong>{cat.name}</strong>
                    </td>
                    <td>/{cat.slug}</td>
                    <td>{Number(cat.default_commission_rate ?? 10)}%</td>
                    <td>
                      <span className="status-badge status-approved">
                        {cat.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION: BRANDS */}
        {activeSection === "brands" && (
          <div className="seller-table-card" style={{ padding: 20 }}>
            <h3>Marketplace Brands ({allBrands.length})</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newBrandName.trim()) return;
                const ok = await executeAdminMutation({
                  entity: "brand",
                  name: newBrandName,
                  isFeatured: true,
                });
                if (ok) setNewBrandName("");
              }}
              style={{
                display: "flex",
                gap: 10,
                marginTop: 12,
                marginBottom: 16,
              }}
            >
              <input
                type="text"
                placeholder="New Brand Name..."
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="button button-primary">
                + Add Brand
              </button>
            </form>

            <table className="seller-table">
              <thead>
                <tr>
                  <th>Brand Name</th>
                  <th>Slug</th>
                  <th>Featured</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {allBrands.map((b: any) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.name}</strong>
                    </td>
                    <td>/{b.slug}</td>
                    <td>{b.is_featured ? "⭐ Yes" : "No"}</td>
                    <td>
                      <span className="status-badge status-approved">
                        {b.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION: COUPONS */}
        {activeSection === "coupons" && (
          <div className="seller-table-card" style={{ padding: 20 }}>
            <h3>Promotional Coupons ({allCoupons.length})</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCouponCode.trim()) return;
                const ok = await executeAdminMutation({
                  entity: "coupon",
                  code: newCouponCode,
                  discountType: newCouponDiscountType,
                  discountValue: Number(newCouponValue),
                  minOrderAmount: Number(newCouponMinOrder),
                });
                if (ok) setNewCouponCode("");
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
                marginTop: 12,
                marginBottom: 16,
              }}
            >
              <input
                type="text"
                placeholder="Code (e.g. EID20)"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value)}
                required
              />
              <select
                value={newCouponDiscountType}
                onChange={(e) =>
                  setNewCouponDiscountType(
                    e.target.value as "percentage" | "fixed"
                  )
                }
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (৳)</option>
              </select>
              <input
                type="number"
                placeholder="Discount Value"
                value={newCouponValue}
                onChange={(e) => setNewCouponValue(e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Min Order (৳)"
                value={newCouponMinOrder}
                onChange={(e) => setNewCouponMinOrder(e.target.value)}
              />
              <button type="submit" className="button button-primary">
                + Save Coupon
              </button>
            </form>

            <table className="seller-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Order</th>
                  <th>Redemptions</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {allCoupons.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.code}</strong>
                    </td>
                    <td>
                      {c.discount_type === "percentage"
                        ? `${c.discount_value}%`
                        : `৳${c.discount_value}`}
                    </td>
                    <td>৳{Number(c.min_order_amount ?? 0)}</td>
                    <td>{Number(c.current_redemptions_count ?? 0)}</td>
                    <td>{c.is_active ? "Active" : "Paused"}</td>
                    <td>
                      <button
                        type="button"
                        className="table-btn"
                        onClick={() =>
                          executeAdminMutation({
                            entity: "coupon",
                            id: c.id,
                            mode: "update",
                            code: c.code,
                            discountType: c.discount_type,
                            discountValue: Number(c.discount_value),
                            minOrderAmount: Number(c.min_order_amount ?? 0),
                            isActive: !c.is_active,
                          })
                        }
                      >
                        {c.is_active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION: COMMISSIONS */}
        {activeSection === "commissions" && (
          <div className="seller-table-card" style={{ padding: 20 }}>
            <h3>Platform Commission Rules ({allCommissionRules.length})</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await executeAdminMutation({
                  entity: "commission_rule",
                  categoryId: newRuleCategoryId || null,
                  commissionPercentage: Number(newRuleRate || 8),
                });
              }}
              style={{
                display: "flex",
                gap: 10,
                marginTop: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <select
                value={newRuleCategoryId}
                onChange={(e) => setNewRuleCategoryId(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              >
                <option value="">Global Marketplace Default</option>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {allCategories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    Category: {cat.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Commission %"
                value={newRuleRate}
                onChange={(e) => setNewRuleRate(e.target.value)}
                style={{ width: 150 }}
                required
              />
              <button type="submit" className="button button-primary">
                + Add Commission Rule
              </button>
            </form>

            <table className="seller-table">
              <thead>
                <tr>
                  <th>Scope / Category</th>
                  <th>Seller Store</th>
                  <th>Commission %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {allCommissionRules.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <strong>
                        {r.categories?.name || "Global Marketplace Rule"}
                      </strong>
                    </td>
                    <td>{r.sellers?.store_name || "All Sellers"}</td>
                    <td>
                      <strong>{Number(r.commission_percentage)}%</strong>
                    </td>
                    <td>
                      <span className="status-badge status-approved">
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {allCommissionRules.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ textAlign: "center", padding: 20 }}
                    >
                      Using category default commission rates.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION: AUDIT LOGS */}
        {activeSection === "audit-logs" && (
          <div className="seller-table-card">
            <div className="card-head-row" style={{ padding: "16px 20px 0" }}>
              <div>
                <h3>Immutable Governance Audit Logs ({allAuditLogs.length})</h3>
                <p>
                  Cryptographic trail of administrative and compliance actions
                  in Supabase.
                </p>
              </div>
            </div>
            <div className="orders-table-wrapper">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Target Entity</th>
                    <th>Target ID</th>
                    <th>Actor User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {allAuditLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td>
                        <small>
                          {new Date(log.created_at).toLocaleString()}
                        </small>
                      </td>
                      <td>
                        <strong>{log.action_name}</strong>
                      </td>
                      <td>{log.target_entity}</td>
                      <td>
                        <code>
                          {String(log.target_entity_id || "").slice(0, 12)}
                        </code>
                      </td>
                      <td>
                        <small>
                          {String(log.actor_user_id || "system").slice(0, 12)}
                        </small>
                      </td>
                    </tr>
                  ))}
                  {allAuditLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ textAlign: "center", padding: 24 }}
                      >
                        No audit log entries recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
