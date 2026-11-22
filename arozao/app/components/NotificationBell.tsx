"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useNotifications, OrderNotification } from "./NotificationProvider";
import {
  Bell,
  Sparkles,
  Truck,
  CheckCircle2,
  Clock,
  Zap,
  MapPin,
  X,
  Package,
} from "lucide-react";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    simulateNextStatus,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const formatTimeAgo = (isoString: string) => {
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusBadgeClass = (status: OrderNotification["status"]) => {
    switch (status) {
      case "Delivered":
        return "badge-status-delivered";
      case "Shipped":
        return "badge-status-shipped";
      case "Confirmed":
        return "badge-status-confirmed";
      default:
        return "badge-status-processing";
    }
  };

  const renderStatusIcon = (status: OrderNotification["status"]) => {
    switch (status) {
      case "Delivered":
        return <Sparkles size={18} className="text-emerald-500" aria-hidden="true" />;
      case "Shipped":
        return <Truck size={18} className="text-blue-500" aria-hidden="true" />;
      case "Confirmed":
        return <CheckCircle2 size={18} className="text-indigo-500" aria-hidden="true" />;
      default:
        return <Clock size={18} className="text-amber-500" aria-hidden="true" />;
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className={`notification-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${mounted ? unreadCount : 0} unread)`}
        aria-expanded={isOpen}
      >
        <span className="bell-icon" aria-hidden="true">
          <Bell size={20} aria-hidden="true" />
        </span>
        {mounted && unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="region" aria-label="Order Status Notifications">
          {/* Header */}
          <div className="notif-dropdown-header">
            <div className="notif-header-title">
              <strong>Order Notifications</strong>
              {unreadCount > 0 && <span className="notif-unread-pill">{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-read-btn"
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Quick Real-Time Simulator Action */}
          <div className="notif-sim-banner">
            <div className="sim-banner-text">
              <span className="sim-dot" />
              <small>Real-time order status tracking simulation</small>
            </div>
            <button
              type="button"
              className="notif-sim-btn"
              onClick={simulateNextStatus}
              title="Simulate the next order milestone to see toast alert and live status update"
            >
              <Zap size={14} className="inline-block mr-1 text-amber-500" aria-hidden="true" /> Test Status Update
            </button>
          </div>

          {/* Notifications List */}
          <div className="notif-dropdown-list">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-card-item ${notif.read ? "is-read" : "is-unread"}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="notif-icon-wrap">
                    <span className="notif-emoji">{renderStatusIcon(notif.status)}</span>
                  </div>

                  <div className="notif-content-wrap">
                    <div className="notif-title-row">
                      <span className={`notif-status-badge ${getStatusBadgeClass(notif.status)}`}>
                        {notif.status}
                      </span>
                      <span className="notif-time">{formatTimeAgo(notif.timestamp)}</span>
                    </div>

                    <h4 className="notif-title">{notif.title}</h4>
                    <p className="notif-message">{notif.message}</p>

                    <div className="notif-actions-row">
                      <Link
                        href={`/orders?track=${notif.orderId}`}
                        className="notif-track-link"
                        onClick={() => {
                          markAsRead(notif.id);
                          setIsOpen(false);
                        }}
                      >
                        <MapPin size={13} className="inline-block mr-1 text-red-500" aria-hidden="true" />
                        Track Live Order #{notif.orderId} &rarr;
                      </Link>
                      <button
                        type="button"
                        className="notif-dismiss-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notif.id);
                        }}
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="notif-empty-state">
                <div className="notif-empty-icon" style={{ display: "flex", justifyContent: "center" }}>
                  <Bell size={36} className="text-slate-300 stroke-1" aria-hidden="true" />
                </div>
                <strong>All caught up!</strong>
                <p>You have no recent order notifications. When your orders ship or update, alerts will appear here.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="notif-dropdown-footer">
            <Link
              href="/orders"
              className="notif-view-all-link"
              onClick={() => setIsOpen(false)}
            >
              <Package size={14} className="inline-block mr-1 text-slate-600" aria-hidden="true" />
              View All Orders &amp; Receipts
            </Link>
            {notifications.length > 0 && (
              <button
                type="button"
                className="notif-clear-all-btn"
                onClick={clearAll}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
