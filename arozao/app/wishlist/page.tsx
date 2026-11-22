"use client";

import Link from "next/link";
import Image from "next/image";
import { useWishlist } from "@/components/WishlistProvider";
import { useCart } from "@/components/CartProvider";
import { useToast } from "@/components/ToastNotification";
import { ShoppingCart, Heart, X } from "lucide-react";

export default function WishlistPage() {
  const { items, remove, clear } = useWishlist();
  const { add } = useCart();
  const { showToast } = useToast();

  const handleMoveToCart = (product: typeof items[0]) => {
    add(product, 1);
    remove(product.slug);
    showToast(`Moved "${product.name}" to your cart`, {
      type: "success",
      actionLabel: "View Cart",
      actionHref: "/cart",
    });
  };

  const handleAddAllToCart = () => {
    if (!items.length) return;
    items.forEach((item) => add(item, 1));
    showToast(`Added all ${items.length} wishlist items to your cart!`, {
      type: "success",
      actionLabel: "View Cart",
      actionHref: "/cart",
    });
  };

  return (
    <main className="site-content wishlist-content">
      <div className="page-intro">
        <span className="eyebrow">Saved Favorites</span>
        <h1>My Wishlist</h1>
        <p>Save products you love, track deals, and move them to your cart anytime.</p>
      </div>

      {items.length > 0 ? (
        <div className="wishlist-wrapper">
          <div className="wishlist-top-bar">
            <span className="wishlist-counter">
              <strong>{items.length}</strong> {items.length === 1 ? "item" : "items"} saved
            </span>
            <div className="wishlist-bulk-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={handleAddAllToCart}
              >
                <ShoppingCart size={16} className="inline-block mr-1.5" aria-hidden="true" /> Add all to cart
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={clear}
              >
                Clear wishlist
              </button>
            </div>
          </div>

          <div className="wishlist-grid">
            {items.map((item) => {
              const price = item.salePrice ?? item.price;
              const hasDiscount = item.discount && item.discount > 0;
              const unavailable = item.stock < 1 || item.status === "out-of-stock";

              return (
                <article className="content-card wishlist-card" key={item.slug}>
                  <div className="wishlist-card-media">
                    <Link href={`/product/${item.slug}`}>
                      <Image
                        src={item.thumbnail || item.image}
                        alt={item.name}
                        width={280}
                        height={280}
                        sizes="(max-width: 640px) 100vw, 280px"
                        referrerPolicy="no-referrer"
                        style={{ objectFit: "cover" }}
                      />
                    </Link>
                    {hasDiscount && (
                      <span className="discount-badge">-{item.discount}%</span>
                    )}
                    <button
                      type="button"
                      className="wishlist-remove-icon-btn"
                      onClick={() => remove(item.slug)}
                      aria-label="Remove from wishlist"
                      title="Remove from wishlist"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="wishlist-card-details">
                    <span className="wishlist-card-brand">{item.brand || "Arozao"}</span>
                    <h3 className="wishlist-card-title">
                      <Link href={`/product/${item.slug}`}>{item.name}</Link>
                    </h3>

                    <div className="wishlist-card-price">
                      <span className="price">৳{price.toLocaleString()}</span>
                      {hasDiscount && (
                        <s className="regular-price">৳{item.price.toLocaleString()}</s>
                      )}
                    </div>

                    <div className="wishlist-stock-status">
                      {unavailable ? (
                        <span className="out-of-stock-text">Out of stock</span>
                      ) : (
                        <span className="in-stock-text">In stock</span>
                      )}
                    </div>

                    <div className="wishlist-card-actions">
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={unavailable}
                        onClick={() => handleMoveToCart(item)}
                      >
                        {unavailable ? "Out of stock" : "Move to cart"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => remove(item.slug)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state wishlist-empty-state">
          <div className="empty-icon" style={{ display: "flex", justifyContent: "center" }}>
            <Heart size={48} className="text-slate-300 stroke-1" aria-hidden="true" />
          </div>
          <h2>Your wishlist is currently empty</h2>
          <p>
            Explore our vast collection and tap the heart icon on any product to save it here for later.
          </p>
          <div className="empty-actions">
            <Link href="/products" className="button button-primary">
              Explore products &amp; deals
            </Link>
            <Link href="/" className="button button-secondary">
              Back to home
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
