"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/types";
import { products as defaultCatalogProducts } from "@/lib/products";
import { ProductCard } from "./ProductCard";
import { productMatches, scoreProduct } from "@/lib/search";

type ListingProps = {
  products?: Product[];
  title?: string;
  initialQuery?: string;
  initialCategory?: string;
  initialSubcategory?: string;
};

export function ProductListing({
  products = defaultCatalogProducts,
  title = "Products",
  initialQuery = "",
  initialCategory = "",
  initialSubcategory = "",
}: ListingProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [sort, setSort] = useState("relevance");
  const [priceRange, setPriceRange] = useState("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [activeProducts, setActiveProducts] = useState<Product[]>(products);

  // Sync state when props change
  useEffect(() => {
    setQuery(initialQuery || "");
  }, [initialQuery]);

  useEffect(() => {
    setCategory(initialCategory || "");
  }, [initialCategory]);

  useEffect(() => {
    setSubcategory(initialSubcategory || "");
  }, [initialSubcategory]);

  useEffect(() => {
    setActiveProducts(products);
  }, [products]);

  // If mounted with default static catalog, attempt client hydration from /api/products
  useEffect(() => {
    if (products === defaultCatalogProducts && typeof window !== "undefined") {
      fetch("/api/products?limit=500")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (
            data?.ok &&
            Array.isArray(data.products) &&
            data.products.length > 0
          ) {
            setActiveProducts(data.products);
          }
        })
        .catch(() => {
          // Graceful fallback to initial static catalog
        });
    }
  }, [products]);

  // Seamless synchronization with navbar search bar submissions & browser navigation
  useEffect(() => {
    const syncFromUrl = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get("query") || params.get("q") || "";
      const urlCategory = params.get("category") || "";
      const urlSubcategory = params.get("subcategory") || "";
      setQuery(urlQuery);
      setCategory(urlCategory);
      setSubcategory(urlSubcategory);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("arozao-search-state", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("arozao-search-state", syncFromUrl);
    };
  }, []);

  // Compute available categories dynamically with counts
  const availableCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    activeProducts.forEach((p) => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [activeProducts]);

  const filtered = useMemo(() => {
    return activeProducts
      .filter((product) => productMatches(product, query, category))
      .filter((product) => !subcategory || product.subcategory === subcategory)
      .filter((product) => {
        if (!inStockOnly) return true;
        return product.availability === "in-stock";
      })
      .filter((product) => {
        if (!minRating) return true;
        return product.rating >= minRating;
      })
      .filter((product) => {
        const price = product.salePrice ?? product.price;
        if (priceRange === "under1000") return price < 1000;
        if (priceRange === "1000to3000") return price >= 1000 && price <= 3000;
        if (priceRange === "3000to8000") return price >= 3000 && price <= 8000;
        if (priceRange === "over8000") return price > 8000;
        return true;
      })
      .sort((a, b) => {
        if (sort === "relevance" && query.trim()) {
          const scoreDiff = scoreProduct(b, query) - scoreProduct(a, query);
          if (scoreDiff !== 0) return scoreDiff;
        }
        if (sort === "low") return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
        if (sort === "high") return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
        if (sort === "rating") return b.rating - a.rating || b.reviewCount - a.reviewCount;
        if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
        if (sort === "popular") return Number(b.bestseller) - Number(a.bestseller) || b.reviewCount - a.reviewCount;
        return (
          Number(b.availability === "in-stock") - Number(a.availability === "in-stock") ||
          Number(b.featured) - Number(a.featured) ||
          b.reviewCount - a.reviewCount
        );
      });
  }, [activeProducts, category, inStockOnly, minRating, priceRange, query, sort, subcategory]);

  const hasActiveFilters = Boolean(
    category || priceRange !== "all" || minRating > 0 || inStockOnly || subcategory
  );

  const resetFilters = () => {
    setCategory("");
    setSubcategory("");
    setPriceRange("all");
    setMinRating(0);
    setInStockOnly(false);
  };

  // Progressive rendering: display initial batch of 24 items, progressively append more as user scrolls
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, category, subcategory, sort, priceRange, minRating, inStockOnly]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= filtered.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "450px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);

  return (
    <div className="product-listing-wrapper">
      <div className="search-layout-container">
        {/* Sticky Left Sidebar (Filter Section) */}
        <aside className="search-sidebar-sticky" aria-label="Filters and Sort">
          {/* Header Box: Category / Query & Count */}
          <div className="sidebar-header-box">
            <span className="sidebar-category-label">
              {query
                ? `Results for “${query}”`
                : category
                ? `Category: ${category.replace(/-/g, " ")}`
                : "All Products"}
            </span>
            <span className="sidebar-product-count">
              ({filtered.length} {filtered.length === 1 ? "product" : "products"})
            </span>
          </div>

          {/* Sort Products Dropdown */}
          <div className="sidebar-filter-group">
            <label htmlFor="sidebar-sort-select" className="sidebar-group-title">
              Sort products
            </label>
            <select
              id="sidebar-sort-select"
              className="sidebar-select"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort products"
            >
              <option value="relevance">Sort by: Featured</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
              <option value="rating">Avg. Customer Review</option>
              <option value="newest">Newest Arrivals</option>
              <option value="popular">Best Sellers</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="sidebar-filter-group">
            <span className="sidebar-group-title">Department</span>
            <ul className="sidebar-category-list">
              <li>
                <button
                  type="button"
                  className={`sidebar-category-item-btn ${!category ? "is-active" : ""}`}
                  onClick={() => {
                    setCategory("");
                    setSubcategory("");
                  }}
                >
                  <span>All Categories</span>
                  <small>({activeProducts.length})</small>
                </button>
              </li>
              {availableCategories.map(([cat, count]) => (
                <li key={cat}>
                  <button
                    type="button"
                    className={`sidebar-category-item-btn ${category === cat ? "is-active" : ""}`}
                    onClick={() => {
                      setCategory(cat);
                      setSubcategory("");
                    }}
                  >
                    <span style={{ textTransform: "capitalize" }}>{cat.replace(/-/g, " ")}</span>
                    <small>({count})</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Price Range Filter */}
          <div className="sidebar-filter-group">
            <span className="sidebar-group-title">Price</span>
            <div className="sidebar-price-options">
              <label className="sidebar-radio-label">
                <input
                  type="radio"
                  name="priceRange"
                  checked={priceRange === "all"}
                  onChange={() => setPriceRange("all")}
                />
                <span>All Prices</span>
              </label>
              <label className="sidebar-radio-label">
                <input
                  type="radio"
                  name="priceRange"
                  checked={priceRange === "under1000"}
                  onChange={() => setPriceRange("under1000")}
                />
                <span>Under ৳1,000</span>
              </label>
              <label className="sidebar-radio-label">
                <input
                  type="radio"
                  name="priceRange"
                  checked={priceRange === "1000to3000"}
                  onChange={() => setPriceRange("1000to3000")}
                />
                <span>৳1,000 to ৳3,000</span>
              </label>
              <label className="sidebar-radio-label">
                <input
                  type="radio"
                  name="priceRange"
                  checked={priceRange === "3000to8000"}
                  onChange={() => setPriceRange("3000to8000")}
                />
                <span>৳3,000 to ৳8,000</span>
              </label>
              <label className="sidebar-radio-label">
                <input
                  type="radio"
                  name="priceRange"
                  checked={priceRange === "over8000"}
                  onChange={() => setPriceRange("over8000")}
                />
                <span>Over ৳8,000</span>
              </label>
            </div>
          </div>

          {/* Customer Rating Filter */}
          <div className="sidebar-filter-group">
            <span className="sidebar-group-title">Customer Reviews</span>
            <div className="sidebar-price-options">
              <label className="sidebar-radio-label">
                <input
                  type="radio"
                  name="minRating"
                  checked={minRating === 0}
                  onChange={() => setMinRating(0)}
                />
                <span>All Ratings</span>
              </label>
              <label className="sidebar-radio-label">
                <input
                  type="radio"
                  name="minRating"
                  checked={minRating === 4}
                  onChange={() => setMinRating(4)}
                />
                <span>★ 4.0 &amp; Up</span>
              </label>
              <label className="sidebar-radio-label">
                <input
                  type="radio"
                  name="minRating"
                  checked={minRating === 3}
                  onChange={() => setMinRating(3)}
                />
                <span>★ 3.0 &amp; Up</span>
              </label>
            </div>
          </div>

          {/* Availability Filter */}
          <div className="sidebar-filter-group">
            <span className="sidebar-group-title">Availability</span>
            <label className="sidebar-radio-label">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>In Stock Only</span>
            </label>
          </div>

          {/* Reset Filters button if any filter applied */}
          {hasActiveFilters && (
            <button
              type="button"
              className="sidebar-clear-btn"
              onClick={resetFilters}
            >
              Clear all filters ✕
            </button>
          )}
        </aside>

        {/* Right Main Results Area (Products & Cards) */}
        <main className="search-main-results">
          {filtered.length > 0 ? (
            <>
              {/* Product Cards Grid */}
              <div className="content-grid listing-grid">
                {filtered.slice(0, visibleCount).map((product, index) => (
                  <ProductCard
                    product={product}
                    priority={index === 0}
                    key={product.slug}
                  />
                ))}
              </div>

              {visibleCount < filtered.length && (
                <div
                  ref={sentinelRef}
                  style={{
                    height: "60px",
                    margin: "24px 0",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() =>
                      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
                    }
                    style={{ fontSize: "14px", padding: "8px 20px" }}
                  >
                    Load more products ({filtered.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ padding: "64px 20px", textAlign: "center" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
                No results found{query ? ` for “${query}”` : ""}
              </h2>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                  marginBottom: "24px",
                  maxWidth: 480,
                  marginInline: "auto",
                }}
              >
                Try clearing your active filters or explore our complete catalog.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={resetFilters}
                style={{ padding: "10px 24px" }}
              >
                Reset filters &amp; view all
              </button>
            </div>
          )}
        </main>
      </div>
      {title && <span className="sr-only">{title}</span>}
    </div>
  );
}
