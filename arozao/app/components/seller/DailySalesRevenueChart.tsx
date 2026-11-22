"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export interface DailySalesPoint {
  date: string;
  fullDate: string;
  dayName: string;
  revenue: number;
  orders: number;
  aov: number;
}

interface CustomTooltipProps {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  avgRevenue: number;
}

function buildEmpty30Days(): DailySalesPoint[] {
  const days: DailySalesPoint[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const shortDate = d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
    const fullDate =
      i === 0
        ? `Today (${shortDate})`
        : d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    days.push({
      date: shortDate,
      fullDate,
      dayName,
      revenue: 0,
      orders: 0,
      aov: 0,
    });
  }
  return days;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  avgRevenue,
}) => {
  if (active && payload && payload.length) {
    const data: DailySalesPoint = payload[0].payload;
    const diffFromAvg =
      avgRevenue > 0
        ? Math.round(((data.revenue - avgRevenue) / avgRevenue) * 100)
        : 0;
    const isAboveAvg = diffFromAvg >= 0;

    return (
      <div
        style={{
          background: "#0f172a",
          color: "#f8fafc",
          padding: "12px 16px",
          borderRadius: "10px",
          border: "1px solid #334155",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
          minWidth: "200px",
          fontSize: "13px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            borderBottom: "1px solid #1e293b",
            paddingBottom: "6px",
          }}
        >
          <strong style={{ color: "#f8fafc", fontSize: "13px" }}>
            {data.fullDate}
          </strong>
          <span
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              background: "#1e293b",
              padding: "1px 6px",
              borderRadius: "4px",
            }}
          >
            {data.dayName}
          </span>
        </div>

        <div style={{ marginBottom: "6px" }}>
          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Daily Revenue
          </div>
          <div
            style={{ fontSize: "18px", fontWeight: "700", color: "#fb923c" }}
          >
            ৳{data.revenue.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginTop: "8px",
            paddingTop: "6px",
            borderTop: "1px solid #1e293b",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Orders: </span>
            <strong style={{ color: "#38bdf8" }}>{data.orders} parcels</strong>
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>AOV: </span>
            <strong style={{ color: "#cbd5e1" }}>৳{data.aov}</strong>
          </div>
        </div>

        {avgRevenue > 0 && (
          <div
            style={{
              marginTop: "6px",
              fontSize: "11px",
              color: isAboveAvg ? "#4ade80" : "#f87171",
            }}
          >
            {isAboveAvg
              ? `▲ +${diffFromAvg}% vs period avg`
              : `▼ ${diffFromAvg}% vs period avg`}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function DailySalesRevenueChart({
  data,
}: {
  data?: DailySalesPoint[];
}) {
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<"30D" | "14D" | "7D">("30D");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [metricType, setMetricType] = useState<"revenue" | "orders">("revenue");

  useEffect(() => {
    setMounted(true);
  }, []);

  const sourceData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return buildEmpty30Days();
  }, [data]);

  const filteredData = useMemo(() => {
    if (timeRange === "7D") {
      return sourceData.slice(-7);
    }
    if (timeRange === "14D") {
      return sourceData.slice(-14);
    }
    return sourceData;
  }, [sourceData, timeRange]);

  const stats = useMemo(() => {
    const totalRev = filteredData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalOrders = filteredData.reduce(
      (acc, curr) => acc + curr.orders,
      0
    );
    const avgRev = Math.round(totalRev / (filteredData.length || 1));
    const highestDay = filteredData.reduce(
      (max, curr) => (curr.revenue > max.revenue ? curr : max),
      filteredData[0] || { revenue: 0, date: "N/A" }
    );
    const avgAov =
      totalOrders > 0 ? Math.round(totalRev / totalOrders) : 0;

    return {
      totalRev,
      totalOrders,
      avgRev,
      highestDay,
      avgAov,
    };
  }, [filteredData]);

  const tickInterval = useMemo(() => {
    if (timeRange === "30D") return 3;
    if (timeRange === "14D") return 1;
    return 0;
  }, [timeRange]);

  return (
    <div className="daily-sales-chart-container" style={{ width: "100%" }}>
      {/* Top Header & Interactive Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>📊</span>
            <h3
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: "700",
                color: "var(--color-text-primary, #0f172a)",
              }}
            >
              Daily Sales Revenue
            </h3>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                background: "rgba(249, 115, 22, 0.12)",
                color: "#ea580c",
                padding: "2px 8px",
                borderRadius: "12px",
                border: "1px solid rgba(249, 115, 22, 0.2)",
              }}
            >
              Live Database Ledger
            </span>
          </div>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "12px",
              color: "var(--color-text-secondary, #64748b)",
            }}
          >
            Realized store sales in Bangladeshi Taka (BDT) calculated from your
            verified marketplace sub-orders.
          </p>
        </div>

        {/* Controls Pill Group */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* Metric Selector */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--color-bg-secondary, #f1f5f9)",
              padding: "2px",
              borderRadius: "8px",
              border: "1px solid var(--color-border, #e2e8f0)",
            }}
          >
            <button
              type="button"
              onClick={() => setMetricType("revenue")}
              style={{
                background:
                  metricType === "revenue" ? "#ffffff" : "transparent",
                color: metricType === "revenue" ? "#0f172a" : "#64748b",
                fontWeight: metricType === "revenue" ? "600" : "500",
                border: "none",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow:
                  metricType === "revenue"
                    ? "0 1px 3px rgba(0,0,0,0.1)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              ৳ Revenue
            </button>
            <button
              type="button"
              onClick={() => setMetricType("orders")}
              style={{
                background: metricType === "orders" ? "#ffffff" : "transparent",
                color: metricType === "orders" ? "#0f172a" : "#64748b",
                fontWeight: metricType === "orders" ? "600" : "500",
                border: "none",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow:
                  metricType === "orders"
                    ? "0 1px 3px rgba(0,0,0,0.1)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              📦 Orders
            </button>
          </div>

          {/* Chart Style Toggle */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--color-bg-secondary, #f1f5f9)",
              padding: "2px",
              borderRadius: "8px",
              border: "1px solid var(--color-border, #e2e8f0)",
            }}
          >
            <button
              type="button"
              onClick={() => setChartType("area")}
              title="Area Trend"
              style={{
                background: chartType === "area" ? "#ffffff" : "transparent",
                color: chartType === "area" ? "#0f172a" : "#64748b",
                fontWeight: chartType === "area" ? "600" : "500",
                border: "none",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow:
                  chartType === "area" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              📈 Area
            </button>
            <button
              type="button"
              onClick={() => setChartType("bar")}
              title="Bar Chart"
              style={{
                background: chartType === "bar" ? "#ffffff" : "transparent",
                color: chartType === "bar" ? "#0f172a" : "#64748b",
                fontWeight: chartType === "bar" ? "600" : "500",
                border: "none",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow:
                  chartType === "bar" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              📊 Bars
            </button>
          </div>

          {/* Timeframe Filter */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--color-bg-secondary, #f1f5f9)",
              padding: "2px",
              borderRadius: "8px",
              border: "1px solid var(--color-border, #e2e8f0)",
            }}
          >
            {(["7D", "14D", "30D"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                style={{
                  background: timeRange === range ? "#f97316" : "transparent",
                  color: timeRange === range ? "#ffffff" : "#64748b",
                  fontWeight: timeRange === range ? "600" : "500",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {range === "30D"
                  ? "30 Days"
                  : range === "14D"
                  ? "14 Days"
                  : "7 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights Bar for 30-Day Snapshot */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          background: "var(--color-bg-secondary, #f8fafc)",
          border: "1px solid var(--color-border, #e2e8f0)",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "16px",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-text-secondary, #64748b)",
            }}
          >
            {timeRange} Total Sales
          </span>
          <div
            style={{ fontSize: "16px", fontWeight: "700", color: "#ea580c" }}
          >
            ৳{stats.totalRev.toLocaleString()}
          </div>
        </div>

        <div>
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-text-secondary, #64748b)",
            }}
          >
            Daily Average
          </span>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "var(--color-text-primary, #0f172a)",
            }}
          >
            ৳{stats.avgRev.toLocaleString()}
          </div>
        </div>

        <div>
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-text-secondary, #64748b)",
            }}
          >
            Peak Day ({stats.highestDay.date})
          </span>
          <div
            style={{ fontSize: "16px", fontWeight: "700", color: "#10b981" }}
          >
            ৳{stats.highestDay.revenue.toLocaleString()}
          </div>
        </div>

        <div>
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-text-secondary, #64748b)",
            }}
          >
            Sub-Orders
          </span>
          <div
            style={{ fontSize: "16px", fontWeight: "700", color: "#3b82f6" }}
          >
            {stats.totalOrders} parcels
          </div>
        </div>

        <div>
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-text-secondary, #64748b)",
            }}
          >
            Avg Order Value
          </span>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "var(--color-text-primary, #0f172a)",
            }}
          >
            ৳{stats.avgAov.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div style={{ width: "100%", height: 320, position: "relative" }}>
        {!mounted ? (
          <div
            style={{
              height: 320,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(241, 245, 249, 0.4)",
              borderRadius: "8px",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Loading 30-Day Sales Data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {chartType === "area" ? (
              <AreaChart
                data={filteredData}
                margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient
                    id="ordersGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  interval={tickInterval}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(val) =>
                    metricType === "revenue"
                      ? `৳${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                      : `${val}`
                  }
                  dx={-4}
                />
                <Tooltip
                  content={<CustomTooltip avgRevenue={stats.avgRev} />}
                  cursor={{
                    stroke: "#ea580c",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                {metricType === "revenue" ? (
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Daily Revenue"
                    stroke="#ea580c"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    activeDot={{
                      r: 6,
                      fill: "#ea580c",
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                  />
                ) : (
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders Count"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ordersGradient)"
                    activeDot={{
                      r: 6,
                      fill: "#0284c7",
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                  />
                )}
              </AreaChart>
            ) : (
              <BarChart
                data={filteredData}
                margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  interval={tickInterval}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(val) =>
                    metricType === "revenue"
                      ? `৳${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                      : `${val}`
                  }
                  dx={-4}
                />
                <Tooltip
                  content={<CustomTooltip avgRevenue={stats.avgRev} />}
                  cursor={{ fill: "rgba(249, 115, 22, 0.08)" }}
                />
                <Bar
                  dataKey={metricType === "revenue" ? "revenue" : "orders"}
                  name={
                    metricType === "revenue" ? "Daily Revenue" : "Orders Count"
                  }
                  fill={metricType === "revenue" ? "#f97316" : "#0284c7"}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Footer with Insights */}
      <div
        style={{
          marginTop: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          paddingTop: "10px",
          borderTop: "1px solid var(--color-border, #e2e8f0)",
          fontSize: "12px",
          color: "var(--color-text-secondary, #64748b)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#10b981", fontWeight: "600" }}>
            ● Live Store Performance:
          </span>
          <span>
            {stats.totalOrders} sub-order parcels totaling ৳
            {stats.totalRev.toLocaleString()} in the selected {timeRange} window.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#ea580c",
              }}
            />
            <span>Revenue (BDT)</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#0284c7",
              }}
            />
            <span>Fulfilled Parcels</span>
          </span>
        </div>
      </div>
    </div>
  );
}
