"use client";

import Link from "next/link";
import { createContext, useContext, useState, useCallback, useMemo } from "react";

type Toast = {
  id: string;
  message: string;
  type?: "success" | "info" | "warning";
  actionLabel?: string;
  actionHref?: string;
};

type ToastContextValue = {
  showToast: (message: string, options?: { type?: "success" | "info" | "warning"; actionLabel?: string; actionHref?: string }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, options?: { type?: "success" | "info" | "warning"; actionLabel?: string; actionHref?: string }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      message,
      type: options?.type || "success",
      actionLabel: options?.actionLabel,
      actionHref: options?.actionHref,
    };

    setToasts((prev) => [...prev.slice(-3), newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item toast-${toast.type || "success"}`} role="status">
            <span className="toast-icon">
              {toast.type === "info" ? "ℹ" : toast.type === "warning" ? "⚠" : "✓"}
            </span>
            <div className="toast-content">
              <span className="toast-text">{toast.message}</span>
              {toast.actionLabel && toast.actionHref && (
                <Link href={toast.actionHref} className="toast-action" onClick={() => removeToast(toast.id)}>
                  {toast.actionLabel}
                </Link>
              )}
            </div>
            <button className="toast-close" type="button" onClick={() => removeToast(toast.id)} aria-label="Close notification">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
