"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import { Home, LayoutGrid, Heart, Package, ShoppingCart } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Do not render bottom nav on seller center or admin portal pages
  if (
    pathname?.startsWith("/sell-on-arozao") ||
    pathname?.startsWith("/seller") ||
    pathname?.startsWith("/admin")
  ) {
    return null;
  }

  const handleOpenCategories = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event("arozao-open-drawer"));
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Bar">
      <Link
        href="/"
        className={`mobile-nav-btn ${pathname === "/" ? "is-active" : ""}`}
        aria-label="Home"
      >
        <span className="mobile-nav-icon">
          <Home size={20} aria-hidden="true" />
        </span>
        <span className="mobile-nav-label">Home</span>
      </Link>

      <button
        type="button"
        onClick={handleOpenCategories}
        className="mobile-nav-btn"
        aria-label="Categories"
      >
        <span className="mobile-nav-icon">
          <LayoutGrid size={20} aria-hidden="true" />
        </span>
        <span className="mobile-nav-label">Categories</span>
      </button>

      <Link
        href="/wishlist"
        className={`mobile-nav-btn ${pathname === "/wishlist" ? "is-active" : ""}`}
        aria-label={`Wishlist with ${mounted ? wishlistCount : 0} items`}
      >
        <span className="mobile-nav-icon relative-badge-wrap">
          <Heart size={20} aria-hidden="true" />
          {mounted && wishlistCount > 0 && <span className="mobile-nav-badge">{wishlistCount}</span>}
        </span>
        <span className="mobile-nav-label">Wishlist</span>
      </Link>

      <Link
        href="/orders"
        className={`mobile-nav-btn ${pathname === "/orders" ? "is-active" : ""}`}
        aria-label="Orders"
      >
        <span className="mobile-nav-icon">
          <Package size={20} aria-hidden="true" />
        </span>
        <span className="mobile-nav-label">Orders</span>
      </Link>

      <Link
        href="/cart"
        className={`mobile-nav-btn ${pathname === "/cart" ? "is-active" : ""}`}
        aria-label={`Cart with ${mounted ? cartCount : 0} items`}
      >
        <span className="mobile-nav-icon relative-badge-wrap">
          <ShoppingCart size={20} aria-hidden="true" />
          {mounted && cartCount > 0 && <span className="mobile-nav-badge">{cartCount}</span>}
        </span>
        <span className="mobile-nav-label">Cart</span>
      </Link>
    </nav>
  );
}
