"use client";

import Link from "next/link";
import Image from "next/image";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Product } from "@/types";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import { useToast } from "./ToastNotification";
import { Heart } from "lucide-react";

export const ProductCard = memo(function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { add } = useCart();
  const { isInWishlist, toggle } = useWishlist();
  const { showToast } = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const price = product.salePrice ?? product.price;
  const regularPrice = product.price;
  const hasDiscount = Boolean(product.discount && product.discount > 0);
  const unavailable = product.stock < 1 || product.status === "out-of-stock";
  const inWishlist = isInWishlist(product.slug);
  const productHref = `/product/${product.slug}`;

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (unavailable) return;
    add(product, 1);
    setJustAdded(true);
    showToast(`Added "${product.name}" to your cart`, {
      type: "success",
      actionLabel: "View Cart",
      actionHref: "/cart",
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(false), 1800);
  }, [add, product, showToast, unavailable]);

  const handleToggleWishlist = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggle(product);
    showToast(
      added ? `Saved "${product.name}" to your wishlist` : `Removed "${product.name}" from your wishlist`,
      {
        type: "info",
        actionLabel: "View Wishlist",
        actionHref: "/wishlist",
      }
    );
  }, [product, showToast, toggle]);

  return (
    <article className="content-card product-card">
      <div className="product-card-media">
        <Link href={productHref} aria-label={`View ${product.name}`}>
          <Image
            src={product.thumbnail || product.image}
            alt={product.name}
            width={320}
            height={320}
            sizes="(max-width: 640px) 46vw, (max-width: 900px) 45vw, (max-width: 1200px) 30vw, 320px"
            priority={priority}
            referrerPolicy="no-referrer"
            style={{ objectFit: "cover" }}
          />
        </Link>
        {hasDiscount && <span className="discount-badge">-{product.discount}%</span>}
        <button
          type="button"
          className={`wishlist-heart-btn ${inWishlist ? "is-active" : ""}`}
          onClick={handleToggleWishlist}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={18} aria-hidden="true" fill={inWishlist ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="product-card-body">
        <div className="product-card-meta">
          <span className="product-card-brand">{product.brand || "Arozao"}</span>
          <span className="product-card-rating">★ {product.rating || 4.6}</span>
        </div>

        <h3 className="product-card-title">
          <Link href={productHref} title={product.name}>
            {product.name}
          </Link>
        </h3>

        <p className="product-description">
          {product.shortDescription || product.description}
        </p>

        <div className="product-card-pricing">
          <span className="price">৳{price.toLocaleString()}</span>
          {hasDiscount && (
            <span className="regular-price">৳{regularPrice.toLocaleString()}</span>
          )}
        </div>

        <button
          className={`button product-card-btn ${justAdded ? "button-success" : ""}`}
          disabled={unavailable}
          onClick={handleAddToCart}
        >
          {unavailable ? "Out of stock" : justAdded ? "Added ✓" : "Add to cart"}
        </button>
      </div>
    </article>
  );
});
