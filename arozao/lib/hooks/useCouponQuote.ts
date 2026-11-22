"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getAuthAccessToken } from "@/lib/auth";

export interface AppliedCouponState {
  code: string;
  discountAmount: number;
  label?: string;
}

export interface UseCouponQuoteProps {
  items?: Array<{ id?: string; slug?: string; quantity: number }>;
  shippingMethod?: "standard" | "express";
  subtotal?: number;
  deliveryFee?: number;
  initialCode?: string;
}

export function useCouponQuote({
  items = [],
  shippingMethod = "standard",
  subtotal = 0,
  deliveryFee = 60,
  initialCode = "",
}: UseCouponQuoteProps) {
  const [couponCode, setCouponCode] = useState(initialCode);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponState | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Keep ref to latest props for stable callbacks
  const propsRef = useRef({ items, shippingMethod, subtotal, deliveryFee });
  propsRef.current = { items, shippingMethod, subtotal, deliveryFee };

  const applyCoupon = useCallback(async (codeOverride?: string) => {
    const raw = codeOverride !== undefined ? codeOverride : couponCode;
    const cleanCode = (raw || "").trim().toUpperCase();
    setCouponError("");

    if (!cleanCode) {
      setCouponError("Please enter a coupon code");
      return { ok: false, error: "Please enter a coupon code" };
    }

    setIsValidating(true);
    try {
      const token = getAuthAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const { items: currentItems, shippingMethod: currentSpeed, subtotal: currentSubtotal, deliveryFee: currentFee } =
        propsRef.current;

      const payload = {
        code: cleanCode,
        shippingMethod: currentSpeed,
        items: currentItems.map((item) => ({
          id: item.id,
          slug: item.slug,
          quantity: item.quantity,
        })),
        subtotal: currentSubtotal,
        deliveryFee: currentFee,
      };

      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers,
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.valid) {
        const errorMsg = data?.error || "Invalid coupon code.";
        setCouponError(errorMsg);
        setAppliedCoupon(null);
        return { ok: false, error: errorMsg };
      }

      const applied: AppliedCouponState = {
        code: data.code || cleanCode,
        discountAmount: Number(data.discountAmount ?? 0),
        label: data.label || `Coupon ${data.code || cleanCode}`,
      };

      setAppliedCoupon(applied);
      setCouponCode("");
      setCouponError("");
      return { ok: true, coupon: applied, quote: data.quote };
    } catch {
      const errorMsg = "Unable to validate coupon code right now. Please try again.";
      setCouponError(errorMsg);
      return { ok: false, error: errorMsg };
    } finally {
      setIsValidating(false);
    }
  }, [couponCode]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  }, []);

  // Re-verify applied coupon if cart items change and coupon is already applied
  useEffect(() => {
    if (appliedCoupon && items.length > 0) {
      void applyCoupon(appliedCoupon.code);
    } else if (items.length === 0 && appliedCoupon) {
      setAppliedCoupon(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, subtotal, shippingMethod]);

  return {
    couponCode,
    setCouponCode,
    appliedCoupon,
    setAppliedCoupon,
    couponError,
    setCouponError,
    isValidating,
    applyCoupon,
    removeCoupon,
  };
}
