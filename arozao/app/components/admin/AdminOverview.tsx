"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BadgeDollarSign,
  PackageCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SellerApplication } from "@/types/seller";

interface DailyGmvPoint {
  date?: string;
  gmv?: number | string;
  orders?: number | string;
}

interface TopSeller {
  store_name?: string;
  slug?: string;
  revenue?: number | string;
  order_count?: number | string;
}

interface TopProduct {
  name?: string;
  slug?: string;
  total_sold?: number | string;
  price?: number | string;
}

interface DashboardData {
  gmv?: {
    total_gmv?: number | string;
    today_gmv?: number | string;
    week_gmv?: number | string;
    total_orders?: number | string;
    today_orders?: number | string;
    aov?: number | string;
  };
  net_revenue?: number | string;
  pending_sellers?: number | string;
  pending_products?: number | string;
  active_sellers?: number | string;
  total_products?: number | string;
  daily_gmv?: DailyGmvPoint[];
  top_sellers?: TopSeller[];
  top_products?: TopProduct[];
  summary?: Record<string, number | string | undefined>;
}

interface AdminOverviewProps {
  data: DashboardData | null;
  applications: SellerApplication[];
}

function numberValue(value: number | string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function taka(value: number | string | undefined): string {
  return `৳${numberValue(value).toLocaleString("en-BD", {
    maximumFractionDigits: 0,
  })}`;
}

function dateLabel(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-BD", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function AdminOverview({
  data,
  applications,
}: AdminOverviewProps) {
  const gmv = data?.gmv;
  const dailyGmv = data?.daily_gmv ?? [];
  const summary = data?.summary;
  const totalOrders = gmv?.total_orders ?? summary?.totalOrders;
  const totalProducts = data?.total_products ?? summary?.totalProducts;
  const activeSellers = data?.active_sellers ?? summary?.activeSellers;
  const pendingSellers =
    data?.pending_sellers ??
    summary?.pendingApplications ??
    applications.filter((application) => application.status === "Under Review")
      .length;
  const pendingProducts =
    data?.pending_products ?? summary?.pendingProducts ?? 0;
  const products = data?.top_products ?? [];
  const sellers = data?.top_sellers ?? [];
  const latestDailyGmv = [...dailyGmv].slice(-7).reverse();

  const metrics = [
    {
      label: "Gross merchandise value",
      value: taka(gmv?.total_gmv ?? summary?.grossPlatformRevenue),
      detail: `Today ${taka(gmv?.today_gmv)}`,
      icon: BadgeDollarSign,
      color: "violet",
    },
    {
      label: "Platform net revenue",
      value: taka(data?.net_revenue ?? summary?.totalPlatformCommission),
      detail: "Commission earned to date",
      icon: Activity,
      color: "green",
    },
    {
      label: "Marketplace orders",
      value: numberValue(totalOrders).toLocaleString("en-BD"),
      detail: `${numberValue(gmv?.today_orders).toLocaleString("en-BD")} today`,
      icon: ShoppingBag,
      color: "blue",
    },
    {
      label: "Average order value",
      value: taka(gmv?.aov),
      detail: `Last 7 days ${taka(gmv?.week_gmv)}`,
      icon: BadgeDollarSign,
      color: "orange",
    },
  ];

  return (
    <section className="admin-overview" aria-label="Sales analytics overview">
      <div className="row g-3 g-xl-4 mb-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div className="col-12 col-sm-6 col-xl-3" key={metric.label}>
              <article className="admin-metric-card h-100">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <p className="admin-metric-label">{metric.label}</p>
                    <p className="admin-metric-value">{metric.value}</p>
                  </div>
                  <span className={`admin-metric-icon is-${metric.color}`}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                </div>
                <p className="admin-metric-detail mb-0">{metric.detail}</p>
              </article>
            </div>
          );
        })}
      </div>

      <div className="row g-3 g-xl-4 mb-4">
        <div className="col-12 col-xl-8">
          <section className="admin-card h-100" aria-labelledby="gmv-chart-title">
            <div className="admin-card-heading">
              <div>
                <h2 id="gmv-chart-title">Sales analytics</h2>
                <p>Gross merchandise value over the last 30 days</p>
              </div>
              <span className="admin-chart-legend">
                <i aria-hidden="true" />
                GMV
              </span>
            </div>
            <div className="admin-chart">
              {dailyGmv.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyGmv}
                    margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="adminGmvFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7158e2" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#7158e2" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="#edf0f6"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={dateLabel}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#8a91a5", fontSize: 11 }}
                      minTickGap={24}
                    />
                    <YAxis
                      tickFormatter={(value: number) =>
                        value >= 1000 ? `৳${Math.round(value / 1000)}k` : `৳${value}`
                      }
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#8a91a5", fontSize: 11 }}
                      width={58}
                    />
                    <Tooltip
                      labelFormatter={(label) => dateLabel(String(label))}
                      formatter={(value) => [taka(String(value)), "GMV"]}
                      contentStyle={{
                        border: "1px solid #e8eaf1",
                        borderRadius: 12,
                        boxShadow: "0 8px 24px rgba(34, 39, 62, .1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="gmv"
                      stroke="#7158e2"
                      strokeWidth={2.5}
                      fill="url(#adminGmvFill)"
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="admin-chart-empty">
                  <Activity size={24} aria-hidden="true" />
                  <span>Sales trend data is not available yet.</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-4">
          <section className="admin-card h-100" aria-labelledby="health-title">
            <div className="admin-card-heading">
              <div>
                <h2 id="health-title">Marketplace health</h2>
                <p>Current operations at a glance</p>
              </div>
            </div>
            <div className="admin-health-list">
              <Link href="/admin/sellers" className="admin-health-item">
                <span className="admin-health-icon is-violet">
                  <Store size={18} aria-hidden="true" />
                </span>
                <span className="admin-health-copy">
                  <strong>Active sellers</strong>
                  <small>Verified marketplace stores</small>
                </span>
                <span className="admin-health-count">
                  {numberValue(activeSellers).toLocaleString("en-BD")}
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/admin/sellers" className="admin-health-item">
                <span className="admin-health-icon is-orange">
                  <Users size={18} aria-hidden="true" />
                </span>
                <span className="admin-health-copy">
                  <strong>Seller applications</strong>
                  <small>Waiting for review</small>
                </span>
                <span className="admin-health-count">
                  {numberValue(pendingSellers).toLocaleString("en-BD")}
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/admin/products" className="admin-health-item">
                <span className="admin-health-icon is-blue">
                  <PackageCheck size={18} aria-hidden="true" />
                </span>
                <span className="admin-health-copy">
                  <strong>Products in catalog</strong>
                  <small>
                    {numberValue(pendingProducts).toLocaleString("en-BD")} pending
                    moderation
                  </small>
                </span>
                <span className="admin-health-count">
                  {numberValue(totalProducts).toLocaleString("en-BD")}
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="row g-3 g-xl-4">
        <div className="col-12 col-xl-7">
          <section className="admin-card h-100" aria-labelledby="daily-activity-title">
            <div className="admin-card-heading">
              <div>
                <h2 id="daily-activity-title">Recent sales activity</h2>
                <p>Daily totals returned by the marketplace analytics API</p>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-borderless align-middle admin-data-table mb-0">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Orders</th>
                    <th scope="col" className="text-end">
                      Gross sales
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {latestDailyGmv.map((day) => (
                    <tr key={day.date}>
                      <td className="fw-semibold">{dateLabel(day.date)}</td>
                      <td>{numberValue(day.orders).toLocaleString("en-BD")}</td>
                      <td className="text-end fw-semibold">{taka(day.gmv)}</td>
                    </tr>
                  ))}
                  {latestDailyGmv.length === 0 && (
                    <tr>
                      <td colSpan={3} className="admin-table-empty">
                        Daily sales activity will appear when data is available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-5">
          <section className="admin-card h-100" aria-labelledby="top-products-title">
            <div className="admin-card-heading">
              <div>
                <h2 id="top-products-title">Top products</h2>
                <p>Best-selling active catalog items</p>
              </div>
              <Link href="/admin/products" className="admin-card-link">
                View catalog <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="admin-top-products">
              {products.slice(0, 5).map((product, index) => (
                <div className="admin-product-row" key={product.slug ?? product.name ?? index}>
                  <span className="admin-product-rank">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="admin-product-copy">
                    <strong>{product.name || "Unnamed product"}</strong>
                    <small>{numberValue(product.total_sold).toLocaleString("en-BD")} sold</small>
                  </span>
                  <span className="admin-product-price">{taka(product.price)}</span>
                </div>
              ))}
              {products.length === 0 && (
                <div className="admin-inline-empty">
                  Top product data is not available yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="col-12">
          <section className="admin-card" aria-labelledby="top-sellers-title">
            <div className="admin-card-heading">
              <div>
                <h2 id="top-sellers-title">Top sellers</h2>
                <p>Seller performance ranked by marketplace revenue</p>
              </div>
              <Link href="/admin/stores" className="admin-card-link">
                View stores <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-borderless align-middle admin-data-table mb-0">
                <thead>
                  <tr>
                    <th scope="col">Store</th>
                    <th scope="col">Orders</th>
                    <th scope="col" className="text-end">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.slice(0, 5).map((seller, index) => (
                    <tr key={seller.slug ?? seller.store_name ?? index}>
                      <td className="fw-semibold">{seller.store_name || "Unnamed store"}</td>
                      <td>{numberValue(seller.order_count).toLocaleString("en-BD")}</td>
                      <td className="text-end fw-semibold">{taka(seller.revenue)}</td>
                    </tr>
                  ))}
                  {sellers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="admin-table-empty">
                        Seller performance data is not available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {applications.length > 0 && (
          <div className="col-12">
            <section className="admin-card" aria-labelledby="applications-title">
              <div className="admin-card-heading">
                <div>
                  <h2 id="applications-title">Latest seller applications</h2>
                  <p>Recently submitted onboarding requests</p>
                </div>
                <Link href="/admin/sellers" className="admin-card-link">
                  Review applications <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <div className="table-responsive">
                <table className="table table-borderless align-middle admin-data-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Application</th>
                      <th scope="col">Store</th>
                      <th scope="col">Applicant</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-end">
                        Review
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.slice(0, 5).map((application) => (
                      <tr key={application.applicationId}>
                        <td className="fw-semibold">{application.applicationId}</td>
                        <td>{application.formData.store.storeName}</td>
                        <td>{application.formData.account.fullName}</td>
                        <td>
                          <span className="admin-application-status">
                            {application.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <Link
                            href={`/admin/sellers/${encodeURIComponent(
                              application.applicationId
                            )}`}
                            className="btn btn-sm admin-review-button"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
