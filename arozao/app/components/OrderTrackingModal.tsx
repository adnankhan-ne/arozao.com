"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Phone, MapPin, Home, Check, Copy, X, Lightbulb, Map, ClipboardList } from "lucide-react";
import { Order } from "@/types";

type OrderTrackingModalProps = {
  order: Order | null;
  onClose: () => void;
};

interface Step {
  id: string;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  status: "completed" | "current" | "upcoming";
}

export function OrderTrackingModal({ order, onClose }: OrderTrackingModalProps) {
  const [riderProgress, setRiderProgress] = useState(65);
  const [isLiveSimulating, setIsLiveSimulating] = useState(true);
  const [activeTab, setActiveTab] = useState<"map" | "timeline">("map");
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [gpsPing, setGpsPing] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (order) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [order]);

  // Simulate subtle real-time GPS telemetry and rider movement
  useEffect(() => {
    if (!isLiveSimulating) return;

    const interval = setInterval(() => {
      setRiderProgress((prev) => {
        if (prev >= 94) return 65; // Loop simulation
        return Number((prev + 0.8).toFixed(1));
      });
      setGpsPing((p) => p + 1);
    }, 2400);

    return () => clearInterval(interval);
  }, [isLiveSimulating]);

  if (!order) return null;

  const orderDate = new Date(order.createdAt);
  const orderTimeStr = orderDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const orderDateStr = orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const trackingCode = `ARZ-TRK-${order.id.replace(/\D/g, "").slice(-6) || "884102"}-BD`;

  const copyTrackingNumber = () => {
    navigator.clipboard?.writeText(trackingCode);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Compute status timeline steps based on order status
  const currentStatus = order.status || "Processing";
  
  const steps: Step[] = [
    {
      id: "placed",
      title: "Order Placed & Confirmed",
      description: "Order verified and inventory reserved at central warehouse.",
      location: "Arozao Central Fulfillment, Tejgaon, Dhaka",
      timestamp: `${orderDateStr}, ${orderTimeStr}`,
      status: "completed",
    },
    {
      id: "packed",
      title: "Quality Inspection & Packed",
      description: "Items carefully inspected, packed in tamper-evident box.",
      location: "Sorting Hub 04, Tejgaon Industrial Area",
      timestamp: `${orderDateStr}, ${new Date(orderDate.getTime() + 45 * 60000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
      status: currentStatus === "Processing" ? "current" : "completed",
    },
    {
      id: "transit",
      title: "Handed over to Express Courier",
      description: "Dispatched with Arozao Express Logistics fleet.",
      location: `Regional Hub, ${order.customer.city || "Dhaka"}`,
      timestamp: `${orderDateStr}, ${new Date(orderDate.getTime() + 130 * 60000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
      status: currentStatus === "Processing" ? "upcoming" : currentStatus === "Confirmed" ? "current" : "completed",
    },
    {
      id: "out-for-delivery",
      title: "Out for Delivery",
      description: "Rider is heading to your designated address with parcel.",
      location: `${order.customer.address}, ${order.customer.city || "Dhaka"}`,
      timestamp: currentStatus === "Delivered" ? "Completed" : "In Progress (Live GPS Active)",
      status: currentStatus === "Delivered" ? "completed" : currentStatus === "Shipped" ? "current" : "upcoming",
    },
    {
      id: "delivered",
      title: "Delivered & Payment Verified",
      description: `Parcel received & Cash on delivery (৳${order.total.toLocaleString()}) collected.`,
      location: `${order.customer.address}`,
      timestamp: currentStatus === "Delivered" ? "Delivered" : `Estimated by ${order.estimatedDelivery}`,
      status: currentStatus === "Delivered" ? "completed" : "upcoming",
    },
  ];

  // Rider coordinates interpolation along simulated vector route
  const startX = 60;
  const startY = 190;
  const hubX = 220;
  const hubY = 120;
  const transitX = 380;
  const transitY = 210;
  const endX = 540;
  const endY = 90;

  // Calculate rider position along piecewise bezier route
  let riderX = hubX;
  let riderY = hubY;
  const norm = riderProgress / 100;
  if (norm <= 0.35) {
    const t = norm / 0.35;
    riderX = startX + (hubX - startX) * t;
    riderY = startY + (hubY - startY) * t;
  } else if (norm <= 0.7) {
    const t = (norm - 0.35) / 0.35;
    riderX = hubX + (transitX - hubX) * t;
    riderY = hubY + (transitY - hubY) * t;
  } else {
    const t = (norm - 0.7) / 0.3;
    riderX = transitX + (endX - transitX) * t;
    riderY = transitY + (endY - transitY) * t;
  }

  const estimatedMinutes = Math.max(8, Math.round((100 - riderProgress) * 0.45));
  const estimatedKm = Math.max(0.6, Number(((100 - riderProgress) * 0.08).toFixed(1)));

  return (
    <div className="tracking-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="tracking-title">
      <div className="tracking-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="tracking-modal-header">
          <div className="tracking-header-info">
            <span className="tracking-live-badge">
              <span className="radar-dot" /> LIVE TRACKING
            </span>
            <h2 id="tracking-title">
              Order #{order.id}
            </h2>
            <div className="tracking-code-row">
              <span>Tracking No: <strong>{trackingCode}</strong></span>
              <button
                type="button"
                className="tracking-copy-btn"
                onClick={copyTrackingNumber}
                title="Copy tracking number"
              >
                {copiedTracking ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Check size={13} aria-hidden="true" /> Copied
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Copy size={13} aria-hidden="true" /> Copy
                  </span>
                )}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="tracking-modal-close"
            onClick={onClose}
            aria-label="Close tracking modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Tab switcher for mobile */}
        <div className="tracking-tab-bar">
          <button
            type="button"
            className={`tracking-tab-btn ${activeTab === "map" ? "is-active" : ""}`}
            onClick={() => setActiveTab("map")}
          >
            <span className="inline-flex items-center gap-1.5">
              <Map size={14} aria-hidden="true" /> Live Route Map
            </span>
          </button>
          <button
            type="button"
            className={`tracking-tab-btn ${activeTab === "timeline" ? "is-active" : ""}`}
            onClick={() => setActiveTab("timeline")}
          >
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList size={14} aria-hidden="true" /> Status Timeline ({steps.filter((s) => s.status === "completed").length}/{steps.length})
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="tracking-modal-body">
          {/* Map Column */}
          <div className={`tracking-map-column ${activeTab === "map" ? "show-mobile" : "hide-mobile"}`}>
            <div className="tracking-map-container">
              {/* Map Canvas / SVG vector representation */}
              <svg className="tracking-map-svg" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet">
                <defs>
                  {/* Grid pattern */}
                  <pattern id="grid-roads" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#252449" strokeWidth="0.8" opacity="0.45" />
                  </pattern>

                  {/* Gradient for route trail */}
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="65%" stopColor="#f1840e" />
                    <stop offset="100%" stopColor="#e2b878" />
                  </linearGradient>

                  {/* Glow filter */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Map Dark Background & Grid */}
                <rect width="600" height="300" fill="#15162d" />
                <rect width="600" height="300" fill="url(#grid-roads)" />

                {/* Simulated Street Network Lines */}
                <path d="M 0 80 Q 200 100 600 70" fill="none" stroke="#2c2d58" strokeWidth="3" />
                <path d="M 0 220 Q 300 240 600 210" fill="none" stroke="#2c2d58" strokeWidth="3" />
                <path d="M 140 0 Q 150 150 160 300" fill="none" stroke="#2c2d58" strokeWidth="2.5" />
                <path d="M 320 0 Q 310 150 330 300" fill="none" stroke="#2c2d58" strokeWidth="2.5" />
                <path d="M 480 0 Q 470 140 490 300" fill="none" stroke="#2c2d58" strokeWidth="2.5" />
                <path d="M 80 0 L 260 300" fill="none" stroke="#232448" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M 520 0 L 380 300" fill="none" stroke="#232448" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* River / Waterway Feature (Buriganga / Turag waterway silhouette) */}
                <path
                  d="M 0 270 Q 150 250 280 285 T 600 260 L 600 300 L 0 300 Z"
                  fill="#1b2545"
                  opacity="0.8"
                />
                <text x="50" y="288" fill="#4d6494" fontSize="10" fontStyle="italic">Buriganga River Channel</text>

                {/* Planned Highway Delivery Route */}
                <path
                  d={`M ${startX} ${startY} L ${hubX} ${hubY} L ${transitX} ${transitY} L ${endX} ${endY}`}
                  fill="none"
                  stroke="#3b3d6f"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Active Colored Completed Trail */}
                <path
                  d={`M ${startX} ${startY} L ${hubX} ${hubY} L ${riderX} ${riderY}`}
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                />

                {/* Origin: Central Warehouse */}
                <g transform={`translate(${startX}, ${startY})`}>
                  <circle r="14" fill="#10b981" fillOpacity="0.25" />
                  <circle r="7" fill="#10b981" />
                  <text y="24" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="600">Tejgaon Hub</text>
                </g>

                {/* Waypoint 1: Sorting Facility */}
                <g transform={`translate(${hubX}, ${hubY})`}>
                  <circle r="10" fill="#f1840e" fillOpacity="0.2" />
                  <circle r="5" fill="#f1840e" />
                  <text y="-14" textAnchor="middle" fill="#cbd5e1" fontSize="9">Midway Dispatch</text>
                </g>

                {/* Waypoint 2: City Junction */}
                <g transform={`translate(${transitX}, ${transitY})`}>
                  <circle r="10" fill="#f1840e" fillOpacity="0.2" />
                  <circle r="5" fill="#f1840e" />
                  <text y="22" textAnchor="middle" fill="#cbd5e1" fontSize="9">Local Station</text>
                </g>

                {/* Destination: Customer Address */}
                <g transform={`translate(${endX}, ${endY})`}>
                  <circle r="18" fill="#e05a43" fillOpacity="0.2" className="ping-destination" />
                  <circle r="9" fill="#e05a43" />
                  <text y="-16" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="700">📍 Destination</text>
                  <text y="24" textAnchor="middle" fill="#f7f5ef" fontSize="9">
                    {order.customer.city || "Dhaka"}
                  </text>
                </g>

                {/* Animated Rider Vehicle Marker with Live Ping */}
                <g transform={`translate(${riderX}, ${riderY})`}>
                  {/* Pulsing GPS Radar Ring */}
                  <circle r="22" fill="#f1840e" fillOpacity="0.2" className="rider-radar-ring" />
                  <circle r="14" fill="#f1840e" fillOpacity="0.4" />
                  <circle r="8" fill="#fff" />
                  {/* Courier Van / Bike icon pin */}
                  <g transform="translate(-12, -26)">
                    <rect width="24" height="18" rx="4" fill="#f1840e" />
                    <polygon points="12,24 8,18 16,18" fill="#f1840e" />
                    <text x="12" y="13" textAnchor="middle" fontSize="11" fill="#fff">🛵</text>
                  </g>
                </g>
              </svg>

              {/* Map Overlay Card: Live Telemetry */}
              <div className="tracking-map-telemetry">
                <div className="telemetry-stat">
                  <small>Status</small>
                  <strong>On the Way</strong>
                </div>
                <div className="telemetry-stat">
                  <small>Distance Left</small>
                  <strong>{estimatedKm} km</strong>
                </div>
                <div className="telemetry-stat">
                  <small>Estimated Arrival</small>
                  <strong className="telemetry-eta">~{estimatedMinutes} mins</strong>
                </div>
                <button
                  type="button"
                  className="telemetry-sim-toggle"
                  onClick={() => setIsLiveSimulating(!isLiveSimulating)}
                  title={isLiveSimulating ? "Pause live simulation" : "Resume live simulation"}
                >
                  {isLiveSimulating ? "⏸ Pause GPS" : "▶ Resume GPS"}
                </button>
              </div>

              {/* Courier Rider Profile Badge */}
              <div className="tracking-rider-card">
                <div className="rider-avatar-wrap">
                  <div className="rider-avatar">🛵</div>
                  <span className="rider-online-dot" />
                </div>
                <div className="rider-meta">
                  <span className="rider-name">Md. Tariqul Islam</span>
                  <span className="rider-sub">Arozao Express Courier • ★ 4.9 (420+ trips)</span>
                  <span className="rider-vehicle">Hero Hunk 150cc • Dhaka Metro-Ha 42-8819</span>
                </div>
                <div className="rider-actions">
                  <a href="tel:+8801700000000" className="button button-secondary rider-call-btn">
                    <Phone size={14} style={{ marginRight: 6 }} aria-hidden="true" /> Call Rider
                  </a>
                </div>
              </div>
            </div>

            {/* Destination Info Box */}
            <div className="tracking-destination-card">
              <div className="dest-icon" aria-hidden="true">
                <Home size={22} className="text-[#f1840e]" />
              </div>
              <div className="dest-details">
                <strong>Delivery Destination:</strong>
                <p>{order.customer.address}, {order.customer.city || "Bangladesh"}</p>
                <small>Recipient: {order.customer.name} • {order.customer.phone}</small>
              </div>
              <div className="dest-payment-badge">
                <small>Payment on Delivery</small>
                <strong>৳{order.total.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Timeline Steps Column */}
          <div className={`tracking-timeline-column ${activeTab === "timeline" ? "show-mobile" : "hide-mobile"}`}>
            <h3 className="timeline-heading">Status Milestones</h3>
            <div className="tracking-stepper">
              {steps.map((step, index) => {
                const isCompleted = step.status === "completed";
                const isCurrent = step.status === "current";

                return (
                  <div
                    className={`step-item ${isCompleted ? "is-completed" : ""} ${isCurrent ? "is-current" : ""}`}
                    key={step.id}
                  >
                    <div className="step-marker-col">
                      <div className="step-node">
                        {isCompleted ? "✓" : isCurrent ? "●" : index + 1}
                      </div>
                      {index < steps.length - 1 && <div className="step-connecting-line" />}
                    </div>

                    <div className="step-content">
                      <div className="step-head">
                        <strong className="step-title">{step.title}</strong>
                        <span className="step-time">{step.timestamp}</span>
                      </div>
                      <p className="step-desc">{step.description}</p>
                      <span className="step-location">
                        <MapPin size={12} className="inline mr-1" aria-hidden="true" />
                        {step.location}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Items summary */}
            <div className="tracking-items-summary">
              <h4>Package Items ({order.items.length})</h4>
              <div className="tracking-items-list">
                {order.items.map((item) => (
                  <div className="tracking-item-chip" key={item.slug}>
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={44}
                      height={44}
                      referrerPolicy="no-referrer"
                      className="tracking-item-img"
                      style={{ objectFit: "cover", borderRadius: 4 }}
                    />
                    <div className="tracking-item-text">
                      <strong>{item.name}</strong>
                      <small>Qty: {item.quantity} • ৳{(item.price * item.quantity).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="tracking-modal-footer">
          <div className="tracking-footer-hint">
            <Lightbulb size={14} className="inline mr-1 text-amber-500" aria-hidden="true" /> Live GPS updates automatically every few seconds.
          </div>
          <button type="button" className="button button-primary" onClick={onClose}>
            Done Tracking
          </button>
        </div>
      </div>
    </div>
  );
}
