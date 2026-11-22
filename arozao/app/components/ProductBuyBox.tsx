"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShoppingCart,
  Zap,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/components/CartProvider";
import { useWishlist } from "@/components/WishlistProvider";
import { useToast } from "@/components/ToastNotification";

interface ProductBuyBoxProps {
  product: Product;
}

export function ProductBuyBox({ product }: ProductBuyBoxProps) {
  const router = useRouter();
  const { add } = useCart();
  const { isInWishlist, toggle } = useWishlist();
  const { showToast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const buyBoxRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const price = product.salePrice ?? product.price;
  const regularPrice = product.price;
  const hasDiscount = Boolean(product.discount && product.discount > 0 && regularPrice > price);
  const savings = regularPrice - price;
  const unavailable = product.stock < 1 || product.status === "out-of-stock";
  const inWishlist = isInWishlist(product.slug);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Show floating bottom bar on mobile when scrolling past the main buy box
  useEffect(() => {
    const handleScroll = () => {
      if (!buyBoxRef.current) return;
      const rect = buyBoxRef.current.getBoundingClientRect();
      if (rect.bottom < 100) {
        setShowMobileBar(true);
      } else {
        setShowMobileBar(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddToCart = () => {
    if (unavailable) return;
    add(product, quantity);
    setJustAdded(true);
    showToast(`Added ${quantity} × "${product.name}" to your cart`, {
      type: "success",
      actionLabel: "View Cart",
      actionHref: "/cart",
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (unavailable) return;
    add(product, quantity);
    showToast(`Redirecting to secure checkout...`, {
      type: "info",
    });
    router.push("/checkout");
  };

  const handleToggleWishlist = () => {
    const added = toggle(product);
    showToast(
      added ? `Saved "${product.name}" to wishlist` : `Removed "${product.name}" from wishlist`,
      {
        type: "info",
        actionLabel: "View Wishlist",
        actionHref: "/wishlist",
      }
    );
  };

  return (
    <>
      <div ref={buyBoxRef} className="pdp-buy-box">
        {/* Price & Savings Header inside Buy Box */}
        <div className="buy-box-price-row">
          <span className="buy-box-current-price">৳{price.toLocaleString()}</span>
          {hasDiscount && (
            <span className="buy-box-regular-price">৳{regularPrice.toLocaleString()}</span>
          )}
        </div>

        {hasDiscount && (
          <div className="buy-box-savings-callout">
            <span>You save ৳{savings.toLocaleString()} ({product.discount}%)</span>
          </div>
        )}

        {/* Delivery Destination & ETA */}
        <div className="buy-box-delivery-block">
          <div className="delivery-location-row">
            <MapPin size={15} className="delivery-icon" />
            <span>Deliver to <strong>Dhaka & All 64 Districts</strong></span>
          </div>
          <p className="delivery-eta-text">
            FREE Delivery on orders over ৳1,500. Expected delivery: <strong>Tomorrow, 2–4 business days</strong>.
          </p>
        </div>

        {/* Real-Time Stock Status */}
        <div className="buy-box-stock-status">
          {!unavailable ? (
            <span className="stock-in">
              <CheckCircle2 size={16} className="inline mr-1 text-emerald-600" />
              In Stock &amp; Ready to Ship
            </span>
          ) : (
            <span className="stock-out">
              <AlertTriangle size={16} className="inline mr-1 text-rose-600" />
              Currently Out of Stock
            </span>
          )}
        </div>

        {/* Quantity Stepper (if in stock) */}
        {!unavailable && (
          <div className="buy-box-qty-row">
            <label htmlFor="buybox-qty" className="qty-label">Quantity:</label>
            <div className="qty-stepper">
              <button
                type="button"
                className="qty-btn"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                id="buybox-qty"
                type="number"
                min="1"
                max={product.stock || 99}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) {
                    setQuantity(Math.min(val, product.stock || 99));
                  }
                }}
                className="qty-input"
              />
              <button
                type="button"
                className="qty-btn"
                disabled={quantity >= (product.stock || 99)}
                onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons: Add to Cart & Buy Now */}
        <div className="buy-box-actions">
          <button
            type="button"
            className={`buy-box-btn btn-add-cart ${justAdded ? "btn-success" : ""}`}
            disabled={unavailable}
            onClick={handleAddToCart}
          >
            <ShoppingCart size={17} className="btn-icon" />
            <span>{unavailable ? "Out of Stock" : justAdded ? "Added to Cart ✓" : "Add to Cart"}</span>
          </button>

          <button
            type="button"
            className="buy-box-btn btn-buy-now"
            disabled={unavailable}
            onClick={handleBuyNow}
          >
            <Zap size={17} className="btn-icon" />
            <span>Buy Now</span>
          </button>
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          className={`buy-box-wishlist-btn ${inWishlist ? "is-active" : ""}`}
          onClick={handleToggleWishlist}
        >
          <Heart size={16} fill={inWishlist ? "currentColor" : "none"} />
          <span>{inWishlist ? "In Your Wishlist" : "Add to Wishlist"}</span>
        </button>

        {/* Seller & Dispatch Trust Attribution */}
        <div className="buy-box-seller-matrix">
          <div className="matrix-row">
            <span className="matrix-label">Ships from</span>
            <span className="matrix-val">Arozao Express Hub</span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">Sold by</span>
            <span className="matrix-val font-semibold text-teal-800">
              {product.sellerName || product.brand || "Arozao Verified Merchant"}
            </span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">Returns</span>
            <span className="matrix-val">7-Day Replacement Guarantee</span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">Payment</span>
            <span className="matrix-val">bKash, Nagad, Card &amp; COD</span>
          </div>
        </div>

        {/* Trust Badges Bar */}
        <div className="buy-box-trust-strip">
          <div className="trust-pill">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>100% Genuine</span>
          </div>
          <div className="trust-pill">
            <RotateCcw size={16} className="text-blue-600" />
            <span>Easy Returns</span>
          </div>
          <div className="trust-pill">
            <Truck size={16} className="text-amber-600" />
            <span>Fast Courier</span>
          </div>
        </div>
      </div>

      {/* Floating Sticky Mobile Buy Bar */}
      <aside
        className={`pdp-mobile-floating-bar ${showMobileBar ? "is-visible" : ""}`}
        aria-label="Quick Purchase Floating Bar"
      >
        <div className="mobile-bar-inner">
          <div className="mobile-bar-product">
            <div className="mobile-bar-thumb">
              <Image
                src={product.thumbnail || product.image}
                alt={product.name}
                fill
                sizes="44px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="mobile-bar-text">
              <span className="mobile-bar-title">{product.name}</span>
              <span className="mobile-bar-price">৳{price.toLocaleString()}</span>
            </div>
          </div>

          <div className="mobile-bar-ctas">
            <button
              type="button"
              className="mobile-btn-cart"
              disabled={unavailable}
              onClick={handleAddToCart}
            >
              <ShoppingCart size={16} />
              <span>{justAdded ? "Added ✓" : "Cart"}</span>
            </button>
            <button
              type="button"
              className="mobile-btn-buy"
              disabled={unavailable}
              onClick={handleBuyNow}
            >
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
