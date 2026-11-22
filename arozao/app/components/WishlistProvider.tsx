"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/types";
import { getAuthAccessToken } from "@/lib/auth";

type WishlistContextValue = {
  items: Product[];
  count: number;
  isInWishlist: (slug: string) => boolean;
  toggle: (product: Product) => boolean;
  add: (product: Product) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const hydrated = useRef(false);

  const syncWithServerWishlist = useCallback(async () => {
    const token = getAuthAccessToken();
    if (!token) return;
    try {
      const res = await fetch("/api/wishlist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.ok && Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
      }
    } catch {
      // Fall back to local wishlist if offline
    }
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("arozaoWishlist") || "[]");
      if (Array.isArray(stored)) {
        setItems(stored.filter((item) => item && typeof item.slug === "string"));
      }
    } catch {
      localStorage.removeItem("arozaoWishlist");
    } finally {
      hydrated.current = true;
    }

    void syncWithServerWishlist();
    const handleAuthChange = () => {
      void syncWithServerWishlist();
    };
    window.addEventListener("arozao-auth-change", handleAuthChange);
    return () => window.removeEventListener("arozao-auth-change", handleAuthChange);
  }, [syncWithServerWishlist]);

  useEffect(() => {
    if (hydrated.current) {
      localStorage.setItem("arozaoWishlist", JSON.stringify(items));
    }
  }, [items]);

  const slugSet = useMemo(() => new Set(items.map((i) => i.slug)), [items]);

  const isInWishlist = useCallback((slug: string) => slugSet.has(slug), [slugSet]);

  const toggle = useCallback((product: Product): boolean => {
    let wasAdded = false;
    setItems((current) => {
      const exists = current.some((item) => item.slug === product.slug);
      if (exists) {
        wasAdded = false;
        return current.filter((item) => item.slug !== product.slug);
      } else {
        wasAdded = true;
        return [...current, product];
      }
    });

    const token = getAuthAccessToken();
    if (token) {
      void fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: product.slug, action: "toggle" }),
      }).catch(() => {});
    }

    return wasAdded;
  }, []);

  const add = useCallback((product: Product) => {
    setItems((current) => (current.some((item) => item.slug === product.slug) ? current : [...current, product]));

    const token = getAuthAccessToken();
    if (token) {
      void fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: product.slug, action: "add" }),
      }).catch(() => {});
    }
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((current) => current.filter((item) => item.slug !== slug));

    const token = getAuthAccessToken();
    if (token) {
      void fetch(`/api/wishlist?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);

    const token = getAuthAccessToken();
    if (token) {
      void fetch("/api/wishlist?clear=true", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isInWishlist,
      toggle,
      add,
      remove,
      clear,
    }),
    [items, isInWishlist, toggle, add, remove, clear]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => {
  const value = useContext(WishlistContext);
  if (!value) throw new Error("useWishlist must be used inside WishlistProvider");
  return value;
};
