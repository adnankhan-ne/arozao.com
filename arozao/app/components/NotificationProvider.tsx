"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { Order } from "@/types";
import { getOrders, updateOrderStatus } from "@/lib/orders";
import { getAuthAccessToken } from "@/lib/auth";
import { useToast } from "./ToastNotification";

export type OrderNotification = {
  id: string;
  orderId: string;
  title: string;
  message: string;
  status: Order["status"];
  timestamp: string;
  read: boolean;
};

type NotificationContextValue = {
  notifications: OrderNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  simulateNextStatus: () => void;
  notifyStatusChange: (
    order: Order,
    previousStatus: Order["status"],
    newStatus: Order["status"]
  ) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const { showToast } = useToast();

  const loadServerNotifications = useCallback(async () => {
    const token = getAuthAccessToken();
    if (!token) {
      setNotifications([]);
      return;
    }
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setNotifications([]);
        }
        return;
      }
      const data = await res.json();
      if (data?.ok && Array.isArray(data.notifications)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: OrderNotification[] = data.notifications.map((n: any) => {
          const matchOrder = (n.title || n.message || "").match(
            /ARZ-\d{4}-\d+(?:-\d+)?/
          );
          return {
            id: n.id,
            orderId: matchOrder ? matchOrder[0] : "ORDER",
            title: n.title,
            message: n.message,
            status: n.notification_type === "DELIVERY_OUT" ? "Shipped" : "Processing",
            timestamp: n.created_at,
            read: Boolean(n.is_read),
          };
        });
        setNotifications(mapped);
      }
    } catch {
      // Ignore network errors
    }
  }, []);

  useEffect(() => {
    void loadServerNotifications();
    const handleAuthChange = () => {
      void loadServerNotifications();
    };
    window.addEventListener("arozao-auth-change", handleAuthChange);
    return () =>
      window.removeEventListener("arozao-auth-change", handleAuthChange);
  }, [loadServerNotifications]);

  const notifyStatusChange = useCallback(
    (
      order: Order,
      previousStatus: Order["status"],
      newStatus: Order["status"]
    ) => {
      let title = `Order Status: ${newStatus}`;
      let message = `Order #${order.id} status changed from ${previousStatus} to ${newStatus}.`;

      if (newStatus === "Processing") {
        title = `Order Confirmed: #${order.id}`;
        message = `Your order of ৳${order.total.toLocaleString()} has been received and is being prepared for shipment.`;
      } else if (newStatus === "Confirmed") {
        title = "Order Confirmed & Packed ✅";
        message = `Order #${order.id} has been verified and packed at Arozao Tejgaon Center.`;
      } else if (newStatus === "Shipped") {
        title = "Order Dispatched & Shipped! 🚚";
        message = `Order #${order.id} is with Arozao Express heading to ${
          order.customer.city || "Dhaka"
        }.`;
      } else if (newStatus === "Delivered") {
        title = "Order Delivered Successfully! 🎉";
        message = `Order #${order.id} has been delivered to ${order.customer.address}.`;
      }

      const newNotif: OrderNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId: order.id,
        title,
        message,
        status: newStatus,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);

      showToast(`${title} — ${message}`, {
        type: newStatus === "Delivered" ? "success" : "info",
        actionLabel: "Track Live 📍",
        actionHref: `/orders?track=${order.id}`,
      });
    },
    [showToast]
  );

  const simulateNextStatus = useCallback(() => {
    const orders = getOrders();
    if (!orders || orders.length === 0) return;

    const targetOrder = orders.find((o) => o.status !== "Delivered") || orders[0];
    const flow: Record<Order["status"], Order["status"]> = {
      Processing: "Confirmed",
      Confirmed: "Shipped",
      Shipped: "Delivered",
      Delivered: "Processing",
    };

    const prev = targetOrder.status;
    const next = flow[prev];
    const updated = updateOrderStatus(targetOrder.id, next);
    if (updated) {
      notifyStatusChange(updated, prev, next);
    }
  }, [notifyStatusChange]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    const token = getAuthAccessToken();
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const token = getAuthAccessToken();
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {});
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll,
      simulateNextStatus,
      notifyStatusChange,
    }),
    [
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll,
      simulateNextStatus,
      notifyStatusChange,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};
