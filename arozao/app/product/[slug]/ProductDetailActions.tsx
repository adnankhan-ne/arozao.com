"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { useCart } from "@/components/CartProvider";
import { useWishlist } from "@/components/WishlistProvider";
import { useToast } from "@/components/ToastNotification";
import { ShoppingCart, Zap, Heart } from "lucide-react";

export function ProductDetailActions({ product }: { product: Product }) {
  const router = useRouter();
  const { add } = useCart();
  const { isInWishlist, toggle } = useWishlist();
  const { showToast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const unavailable = product.stock < 1 || product.status === "out-of-stock";
  const inWishlist = isInWishlist(product.slug);

  const handleAddToCart = () => {
    if (unavailable) return;
    add(product, quantity);
    setJustAdded(true);
    showToast(`Added ${quantity} × "${product.name}" to cart`, {
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
    showToast(`Proceeding to checkout with ${product.name}...`, {
      type: "info",
    });
    router.push("/checkout");
  };

  const handleWishlistToggle = () => {
    const added = toggle(product);
    showToast(
      added ? `Saved "${product.name}" to your wishlist` : `Removed "${product.name}" from your wishlist`,
      {
        type: "info",
        actionLabel: "View Wishlist",
        actionHref: "/wishlist",
      }
    );
  };

  return (
    <div className="product-actions-block">
      {!unavailable && (
        <div className="quantity-picker-row">
          <label htmlFor="pdp-quantity" className="quantity-label">
            Quantity:
          </label>
          <div className="quantity-stepper">
            <button
              type="button"
              className="stepper-btn"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              id="pdp-quantity"
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
              className="stepper-input"
              aria-label="Product quantity"
            />
            <button
              type="button"
              className="stepper-btn"
              disabled={quantity >= (product.stock || 99)}
              onClick={() => setQuantity((q) => Math.min((product.stock || 99), q + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <span className="stock-hint">
            {product.stock > 0 ? `(${product.stock} items in stock)` : ""}
          </span>
        </div>
      )}

      <div className="cta-button-group">
        <button
          className={`button button-add-cart ${justAdded ? "button-success" : ""}`}
          disabled={unavailable}
          onClick={handleAddToCart}
        >
          {unavailable ? (
            "Out of stock"
          ) : justAdded ? (
            "Added to Cart ✓"
          ) : (
            <>
              <ShoppingCart size={16} className="inline-block mr-1.5" aria-hidden="true" /> Add to cart
            </>
          )}
        </button>

        <button
          className="button button-buy-now"
          disabled={unavailable}
          onClick={handleBuyNow}
        >
          <Zap size={16} className="inline-block mr-1.5" aria-hidden="true" /> Buy now
        </button>

        <button
          type="button"
          className={`button button-wishlist-toggle ${inWishlist ? "is-active" : ""}`}
          onClick={handleWishlistToggle}
          aria-label={inWishlist ? "Saved in wishlist" : "Add to wishlist"}
        >
          <Heart
            size={16}
            className="inline-block mr-1.5"
            aria-hidden="true"
            fill={inWishlist ? "currentColor" : "none"}
          />
          {inWishlist ? "Saved in Wishlist" : "Add to Wishlist"}
        </button>
      </div>
    </div>
  );
}
