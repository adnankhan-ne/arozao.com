"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useWishlist } from "@/components/WishlistProvider";
import { useToast } from "@/components/ToastNotification";
import {
  Sparkles,
  Heart,
  ShieldCheck,
  Banknote,
  RotateCcw,
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import { useCouponQuote } from "@/lib/hooks/useCouponQuote";

const FREE_SHIPPING_THRESHOLD = 1500;
const STANDARD_SHIPPING_FEE = 60;

export default function Cart() {
  const { items, total, setQuantity, remove } = useCart();
  const { toggle, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  const freeShippingProgress = Math.min(100, Math.round((total / FREE_SHIPPING_THRESHOLD) * 100));
  const isFreeShipping = total >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = items.length === 0 ? 0 : isFreeShipping ? 0 : STANDARD_SHIPPING_FEE;

  const {
    couponCode,
    setCouponCode,
    appliedCoupon,
    couponError,
    isValidating,
    applyCoupon,
    removeCoupon: handleRemoveCoupon,
  } = useCouponQuote({
    items,
    shippingMethod: "standard",
    subtotal: total,
    deliveryFee: shippingFee,
  });

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const grandTotal = Math.max(0, total + shippingFee - discountAmount);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await applyCoupon();
    if (result.ok && result.coupon) {
      showToast(
        `Coupon "${result.coupon.code}" applied: ৳${result.coupon.discountAmount.toLocaleString()} discount!`,
        { type: "success" }
      );
    }
  };

  const handleMoveToWishlist = (item: typeof items[0]) => {
    if (!isInWishlist(item.slug)) {
      toggle(item);
    }
    remove(item.slug);
    showToast(`Moved "${item.name}" to your wishlist`, {
      type: "info",
      actionLabel: "View Wishlist",
      actionHref: "/wishlist",
    });
  };

  const handleRemoveItem = (item: typeof items[0]) => {
    remove(item.slug);
    showToast(`Removed "${item.name}" from your cart`, { type: "info" });
  };

  return (
    <main className="site-content cart-page-content">
      <div className="page-intro">
        <span className="eyebrow">Review Items</span>
        <h1>Your Shopping Cart</h1>
        <p>Review items in your cart, update quantities, and apply vouchers before checking out.</p>
      </div>

      {items.length > 0 ? (
        <div className="cart-layout">
          {/* Left Column: Cart Items List */}
          <div className="cart-items-column">
            {/* Free Shipping Meter */}
            <div className="free-shipping-meter">
              <div className="meter-label">
                {isFreeShipping ? (
                  <span>
                    <Sparkles size={16} className="inline-block mr-1 text-amber-500" aria-hidden="true" />
                    <strong>Congratulations!</strong> You unlocked <strong>FREE Delivery</strong> across Bangladesh!
                  </span>
                ) : (
                  <span>
                    Add <strong>৳{(FREE_SHIPPING_THRESHOLD - total).toLocaleString()}</strong> more to get <strong>FREE Delivery</strong>!
                  </span>
                )}
              </div>
              <div className="meter-progress-track">
                <div
                  className={`meter-progress-fill ${isFreeShipping ? "is-free" : ""}`}
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            <div className="cart-items-list">
              {items.map((item) => {
                const unitPrice = item.salePrice ?? item.price;
                const itemSubtotal = unitPrice * item.quantity;
                return (
                  <article className="cart-item-card" key={item.slug}>
                    <Link href={`/product/${item.slug}`} className="cart-item-image-link">
                      <Image
                        src={item.thumbnail || item.image}
                        alt={item.name}
                        width={80}
                        height={80}
                        sizes="80px"
                        referrerPolicy="no-referrer"
                        style={{ objectFit: "cover", borderRadius: 6 }}
                      />
                    </Link>

                    <div className="cart-item-info">
                      <span className="cart-item-brand">{item.brand || "Arozao"}</span>
                      <h3 className="cart-item-title">
                        <Link href={`/product/${item.slug}`}>{item.name}</Link>
                      </h3>

                      <div className="cart-item-unit-price">
                        Unit price: <strong>৳{unitPrice.toLocaleString()}</strong>
                        {item.salePrice && item.salePrice < item.price && (
                          <s>৳{item.price.toLocaleString()}</s>
                        )}
                      </div>

                      <div className="cart-item-actions-row">
                        <div className="quantity-stepper mini-stepper">
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => setQuantity(item.slug, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            −
                          </button>
                          <span className="stepper-number" aria-label={`Quantity: ${item.quantity}`}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => setQuantity(item.slug, item.quantity + 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        <div className="cart-item-links">
                          <button
                            type="button"
                            className="cart-link-btn"
                            onClick={() => handleMoveToWishlist(item)}
                          >
                            <Heart size={14} className="inline-block mr-1" aria-hidden="true" /> Move to Wishlist
                          </button>
                          <span className="cart-link-sep">•</span>
                          <button
                            type="button"
                            className="cart-link-btn cart-remove-btn"
                            onClick={() => handleRemoveItem(item)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="cart-item-total">
                      <span className="price">৳{itemSubtotal.toLocaleString()}</span>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="cart-continue-shopping">
              <Link href="/products" className="continue-link">
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* Right Column: Order Summary Card */}
          <aside className="cart-summary-column">
            <div className="content-card cart-summary-card">
              <h2>Order Summary</h2>

              <div className="summary-line">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <strong>৳{total.toLocaleString()}</strong>
              </div>

              <div className="summary-line">
                <span>
                  Estimated Delivery{" "}
                  {isFreeShipping && <small className="free-tag">FREE</small>}
                </span>
                <strong>{shippingFee === 0 ? "৳0 (Free)" : `৳${shippingFee}`}</strong>
              </div>

              {appliedCoupon && (
                <div className="summary-line discount-line">
                  <span>
                    Coupon ({appliedCoupon.code})
                    <button type="button" className="remove-coupon-btn" onClick={handleRemoveCoupon}>
                      ✕
                    </button>
                  </span>
                  <strong>-৳{appliedCoupon.discountAmount.toLocaleString()}</strong>
                </div>
              )}

              <hr className="summary-divider" />

              <div className="summary-line total-line">
                <span>Total Amount</span>
                <strong className="grand-total">৳{grandTotal.toLocaleString()}</strong>
              </div>

              {/* Promo code input */}
              <form className="coupon-form" onSubmit={handleApplyCoupon}>
                <div className="coupon-input-group">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    aria-label="Coupon code"
                  />
                  <button
                    type="submit"
                    className="button button-secondary"
                    disabled={isValidating}
                  >
                    {isValidating ? "Applying..." : "Apply"}
                  </button>
                </div>
                {couponError && <p className="coupon-error-msg">{couponError}</p>}
              </form>

              <Link
                href={
                  appliedCoupon
                    ? `/checkout?coupon=${encodeURIComponent(appliedCoupon.code)}`
                    : "/checkout"
                }
                className="button button-primary button-checkout-cta"
              >
                Proceed to Checkout →
              </Link>

              <div className="cart-security-badges">
                <div className="security-item">
                  <ShieldCheck size={16} className="inline-block mr-1.5 text-emerald-600" aria-hidden="true" />
                  100% Secure Checkout
                </div>
                <div className="security-item">
                  <Banknote size={16} className="inline-block mr-1.5 text-emerald-600" aria-hidden="true" />
                  Cash on Delivery Available
                </div>
                <div className="security-item">
                  <RotateCcw size={16} className="inline-block mr-1.5 text-emerald-600" aria-hidden="true" />
                  7-Day Easy Returns Guarantee
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="empty-state cart-empty-state">
          <div className="empty-icon" style={{ display: "flex", justifyContent: "center" }}>
            <ShoppingCart size={48} className="text-slate-400 stroke-1" aria-hidden="true" />
          </div>
          <h2>Your shopping cart is empty</h2>
          <p>Explore thousands of products, electronics, fashion, and home essentials waiting for you.</p>
          <div className="empty-actions">
            <Link href="/products" className="button button-primary">
              Discover Products &amp; Deals
            </Link>
            <Link href="/wishlist" className="button button-secondary">
              View Your Wishlist
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
