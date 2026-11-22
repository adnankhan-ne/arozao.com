"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CartItem, Product } from "@/types";
import { getAuthAccessToken } from "@/lib/auth";

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  add: (product: Product, quantity?: number) => void;
  remove: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  clear: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);

  const syncWithServerCart = useCallback(async (localGuestItems: CartItem[]) => {
    const token = getAuthAccessToken();
    if (!token) return;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    try {
      if (localGuestItems.length > 0) {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          credentials: "include",
          body: JSON.stringify({
            action: "merge",
            items: localGuestItems.map((i) => ({
              slug: i.slug,
              id: i.id,
              quantity: i.quantity,
            })),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && Array.isArray(data.items)) {
            setItems(data.items);
            return;
          }
        }
      }

      const res = await fetch("/api/cart", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.items)) {
          setItems(data.items);
        }
      }
    } catch {
      // Fall back to local state if offline
    }
  }, []);

  useEffect(() => {
    let initialItems: CartItem[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem("arozaoCart") || "[]");
      if (Array.isArray(stored)) {
        initialItems = stored.filter(
          (item) => item && typeof item.slug === "string" && Number(item.quantity) > 0
        );
        setItems(initialItems);
      }
    } catch {
      localStorage.removeItem("arozaoCart");
    } finally {
      hydrated.current = true;
    }

    void syncWithServerCart(initialItems);

    const handleAuthChange = () => {
      const currentRaw = localStorage.getItem("arozaoCart");
      let currentGuest: CartItem[] = [];
      try {
        currentGuest = currentRaw ? JSON.parse(currentRaw) : [];
      } catch {
        currentGuest = [];
      }
      void syncWithServerCart(Array.isArray(currentGuest) ? currentGuest : []);
    };

    window.addEventListener("arozao-auth-change", handleAuthChange);
    return () => window.removeEventListener("arozao-auth-change", handleAuthChange);
  }, [syncWithServerCart]);

  useEffect(() => {
    if (hydrated.current) {
      localStorage.setItem("arozaoCart", JSON.stringify(items));
    }
  }, [items]);

  const add = useCallback((product: Product, quantity: number = 1) => {
    const qty = Math.max(1, quantity);
    setItems((current) => {
      const maxStock = product.stock > 0 ? product.stock : 99;
      return current.some((item) => item.slug === product.slug)
        ? current.map((item) =>
            item.slug === product.slug
              ? { ...item, quantity: Math.min(maxStock, item.quantity + qty) }
              : item
          )
        : [...current, { ...product, quantity: Math.min(maxStock, qty) }];
    });

    const token = getAuthAccessToken();
    if (token) {
      void fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          action: "add",
          slug: product.slug,
          quantity: qty,
        }),
      }).catch(() => {});
    }
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((current) => current.filter((item) => item.slug !== slug));

    const token = getAuthAccessToken();
    if (token) {
      void fetch(`/api/cart?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      }).catch(() => {});
    }
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    setItems((current) =>
      quantity < 1
        ? current.filter((item) => item.slug !== slug)
        : current.map((item) =>
            item.slug === slug
              ? {
                  ...item,
                  quantity:
                    item.stock > 0 ? Math.min(item.stock, quantity) : quantity,
                }
              : item
          )
    );

    const token = getAuthAccessToken();
    if (token) {
      void fetch("/api/cart", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ slug, quantity }),
      }).catch(() => {});
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);

    const token = getAuthAccessToken();
    if (token) {
      void fetch("/api/cart?clear=true", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      }).catch(() => {});
    }
  }, []);

  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const total = useMemo(() => items.reduce((sum, item) => sum + (item.salePrice ?? item.price) * item.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items,
      count,
      total,
      add,
      remove,
      setQuantity,
      clear,
    }),
    [items, count, total, add, remove, setQuantity, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
};
