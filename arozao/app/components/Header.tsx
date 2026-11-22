"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import { NotificationBell } from "./NotificationBell";
import {
  Search,
  Heart,
  Package,
  User,
  ShoppingCart,
  Menu,
  X,
} from "lucide-react";

type SearchSuggestion = {
  id: string;
  slug: string;
  name: string;
  salePrice: number;
  thumbnail: string;
};

const drawerGroups = [
  {
    title: "Electronics",
    items: [
      ["Phone Accessories", "phone-accessories"],
      ["Computer Accessories", "computer-accessories"],
      ["Gadgets", "gadgets"],
    ],
  },
  {
    title: "Home & Kitchen",
    items: [
      ["Home Decor", "home-decor"],
      ["Kitchen Applications", "kitchen-appliances"],
      ["Life Style", "lifestyle"],
      ["Showpieces", "showpieces"],
    ],
  },
  {
    title: "Clothings & Fashions",
    items: [
      ["Girls", "girls-fashion"],
      ["Boys", "boys-fashion"],
    ],
  },
] as const;

export function Header() {
  const router = useRouter();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [mounted, setMounted] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsCache = useRef<Record<string, SearchSuggestion[]>>({});
  const searchContainerRef = useRef<HTMLFormElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  const closeDrawer = () => {
    setOpen(false);
    triggerButtonRef.current?.focus();
  };

  useEffect(() => {
    if (open) {
      document.body.classList.add("drawer-open");
      const focusTimer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(focusTimer);
        document.body.classList.remove("drawer-open");
      };
    } else {
      document.body.classList.remove("drawer-open");
    }
  }, [open]);

  const handleDrawerKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key === "Tab") {
      if (!drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const cacheKey = `${searchCategory}::${q.toLowerCase()}`;
    if (suggestionsCache.current[cacheKey]) {
      setSuggestions(suggestionsCache.current[cacheKey]);
      setShowSuggestions(true);
      return;
    }

    const abortController = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(q)}&category=${encodeURIComponent(searchCategory)}`,
          { signal: abortController.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.suggestions)) {
            suggestionsCache.current[cacheKey] = data.suggestions;
            setSuggestions(data.suggestions);
            if (data.suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }
        }
      } catch {
        // Abort or network failure handled gracefully
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchQuery, searchCategory]);

  useEffect(() => {
    setMounted(true);

    // If Supabase redirects a hash-based recovery link (#access_token=...&type=recovery)
    // to the Site URL root or any page other than `/login`, forward to `/login?mode=update-password`
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        if (
          hashParams.get("type") === "recovery" &&
          hashParams.get("access_token")
        ) {
          window.location.replace(
            `/login?mode=update-password#${hash}`
          );
        }
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", closeOnEscape);
    const handleOpenDrawerEvent = () => setOpen(true);
    window.addEventListener("arozao-open-drawer", handleOpenDrawerEvent);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("arozao-open-drawer", handleOpenDrawerEvent);
    };
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setSearchQuery(params.get("query") || params.get("q") || "");
      setSearchCategory(params.get("category") || "");
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("arozao-search-state", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("arozao-search-state", syncFromUrl);
    };
  }, []);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowSuggestions(false);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("query", searchQuery.trim());
    if (searchCategory) params.set("category", searchCategory);
    const target = `/products${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(target);
    window.dispatchEvent(new Event("arozao-search-state"));
  };

  const pathname = usePathname();

  if (
    pathname?.startsWith("/sell-on-arozao") ||
    pathname?.startsWith("/seller") ||
    pathname?.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <header className="topbar">
      <div className="arozao-header">
        <button
          ref={triggerButtonRef}
          className="header-menu"
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close all categories" : "Open all categories"}
          aria-expanded={open}
          aria-controls="category-drawer-dialog"
        >
          <Menu size={18} aria-hidden="true" /> All
        </button>
        <Link className="header-logo" href="/" aria-label="Arozao home">
          arozao
        </Link>
        <form
          ref={searchContainerRef}
          className="header-search"
          action="/products"
          role="search"
          onSubmit={handleSearchSubmit}
        >
          <select
            name="category"
            aria-label="Choose category"
            value={searchCategory}
            onChange={(event) => {
              setSearchCategory(event.target.value);
            }}
          >
            <option value="">All</option>
            <option value="electronics">Electronics</option>
            <option value="gadgets">Gadgets</option>
            <option value="phone-accessories">Phones</option>
            <option value="computer-accessories">Computers</option>
            <option value="fashion">Fashion</option>
            <option value="home-decor">Home</option>
            <option value="kitchen-appliances">Kitchen</option>
          </select>
          <input
            name="query"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="Search products, brands and essentials…"
            aria-label="Search arozao"
            autoComplete="off"
          />
          <button type="submit" aria-label="Submit search">
            <Search size={18} aria-hidden="true" />
          </button>
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
              {suggestions.map((product) => (
                <Link
                  href={`/product/${product.slug}`}
                  className="search-suggestion"
                  role="option"
                  key={product.id}
                  onClick={() => {
                    setSearchQuery(product.name);
                    setShowSuggestions(false);
                  }}
                >
                  <Image
                    src={product.thumbnail || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=100&q=80"}
                    alt=""
                    width={40}
                    height={40}
                    referrerPolicy="no-referrer"
                    style={{ objectFit: "cover", borderRadius: 4 }}
                  />
                  <span>
                    <strong>{product.name}</strong>
                    <small>৳{product.salePrice.toLocaleString()}</small>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </form>

        <Link className="header-wishlist" href="/wishlist" aria-label={`Wishlist with ${mounted ? wishlistCount : 0} items`}>
          <span className="header-wishlist-icon" aria-hidden="true">
            <Heart size={20} aria-hidden="true" />
            {mounted && wishlistCount > 0 && <b>{wishlistCount}</b>}
          </span>
          <span className="header-nav-text">
            <small>Favorites</small>
            <strong>Wishlist</strong>
          </span>
        </Link>

        <Link className="header-orders" href="/orders" aria-label="Orders & Returns">
          <span className="header-orders-icon" aria-hidden="true">
            <Package size={20} aria-hidden="true" />
          </span>
          <span className="header-nav-text">
            <small>Track</small>
            <strong>Orders</strong>
          </span>
        </Link>

        {/* Real-time Order Notifications Bell */}
        <NotificationBell />

        <Link className="header-account" href="/account">
          <span className="header-account-icon" aria-hidden="true">
            <User size={20} aria-hidden="true" />
          </span>
          <span className="header-nav-text">
            <strong>Account</strong>
          </span>
        </Link>

        <Link className="header-cart" href="/cart" aria-label={`Cart with ${mounted ? cartCount : 0} items`}>
          <span className="header-cart-icon" aria-hidden="true">
            <ShoppingCart size={20} aria-hidden="true" />
            <b>{mounted ? cartCount : 0}</b>
          </span>
          <span className="header-nav-text">
            <small>Subtotal</small>
            <strong>Cart</strong>
          </span>
        </Link>
      </div>

      {open && (
        <>
          <div className="drawer-overlay is-visible" onClick={closeDrawer} aria-hidden="true" />
          <aside
            ref={drawerRef}
            id="category-drawer-dialog"
            className="category-drawer is-open"
            role="dialog"
            aria-modal="true"
            aria-label="All Categories"
            onKeyDown={handleDrawerKeyDown}
          >
            <div className="drawer-header">
              <button
                ref={closeButtonRef}
                className="drawer-close"
                onClick={closeDrawer}
                aria-label="Close categories"
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
              <strong>All Categories</strong>
            </div>
            <div className="drawer-content">
              {drawerGroups.map((group) => (
                <section className="drawer-section" key={group.title}>
                  <h3>{group.title}</h3>
                  {group.items.map(([label, slug]) => (
                    <Link
                      className="drawer-section-link drawer-category-link"
                      key={slug}
                      href={`/products?category=${slug}`}
                      onClick={closeDrawer}
                    >
                      {label}
                      <span aria-hidden="true">›</span>
                    </Link>
                  ))}
                </section>
              ))}

              <section className="drawer-section drawer-help">
                <h3>Customer Care &amp; Account</h3>
                <Link className="drawer-section-link" href="/account" onClick={closeDrawer}>
                  <User size={16} aria-hidden="true" style={{ marginRight: 8 }} /> Your Account
                </Link>
                <Link className="drawer-section-link" href="/orders" onClick={closeDrawer}>Returns &amp; Refunds</Link>
                <Link className="drawer-section-link" href="/help" onClick={closeDrawer}>Customer Service</Link>
              </section>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}

