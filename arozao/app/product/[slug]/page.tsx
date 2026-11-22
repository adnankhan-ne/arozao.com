import Link from "next/link";
import { notFound } from "next/navigation";
import { products as staticProducts, getProductBySlug } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { ProductReviewsSection } from "@/components/ProductReviewsSection";
import { ShareProductButton } from "@/components/ShareProductButton";
import type { Metadata } from "next";
import type { Product } from "@/types";
import { Star, Truck, ShieldCheck, RotateCcw, Banknote, ArrowRight } from "lucide-react";

export const revalidate = 60;

export function generateStaticParams() {
  return staticProducts
    .filter((product) => product.status === "active")
    .map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { product } = await getProductBySlug(params.slug);
  return product
    ? {
        title: `${product.name} | Arozao`,
        description: product.shortDescription,
        alternates: {
          canonical: `/product/${product.slug}`,
        },
        openGraph: {
          title: product.name,
          description: product.shortDescription,
          url: `/product/${product.slug}`,
          images: [product.thumbnail || product.image],
        },
        twitter: {
          card: "summary_large_image",
          title: product.name,
          description: product.shortDescription,
          images: [product.thumbnail || product.image],
        },
      }
    : { title: "Product | Arozao" };
}

function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export default async function ProductDetail({
  params,
}: {
  params: { slug: string };
}) {
  const { product } = await getProductBySlug(params.slug);
  if (!product || product.status !== "active") notFound();

  const price = product.salePrice ?? product.price;
  const regularPrice = product.price;
  const hasDiscount = Boolean(product.discount && product.discount > 0 && regularPrice > price);
  const savings = regularPrice - price;

  // Find related products from the same category
  const relatedProducts: Product[] = staticProducts
    .filter((p) => p.category === product.category && p.slug !== product.slug && p.status === "active")
    .slice(0, 4);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.shortDescription || product.description,
    image: [product.image || product.thumbnail],
    brand: {
      "@type": "Brand",
      name: product.brand || "Arozao",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency || "BDT",
      price: String(price),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `https://arozao.com/product/${product.slug}`,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(product.rating || 4.7),
      reviewCount: String(Math.max(1, product.reviewCount || 12)),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://arozao.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category.replace(/-/g, " "),
        item: `https://arozao.com/category/${product.category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `https://arozao.com/product/${product.slug}`,
      },
    ],
  };

  return (
    <div className="pdp-dense-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <div className="pdp-container">
        {/* Header Strip with Breadcrumb Navigation & Share Button */}
        <div className="pdp-header-strip">
          <nav className="pdp-breadcrumb-strip" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="crumb-slash">/</span>
            <Link href={`/products?category=${product.category}`}>
              {product.category.replace(/-/g, " ")}
            </Link>
            {product.subcategory && (
              <>
                <span className="crumb-slash">/</span>
                <Link href={`/products?category=${product.category}&subcategory=${product.subcategory}`}>
                  {product.subcategory.replace(/-/g, " ")}
                </Link>
              </>
            )}
            <span className="crumb-slash">/</span>
            <span className="crumb-active">{product.name}</span>
          </nav>

          <ShareProductButton title={product.name} slug={product.slug} />
        </div>

        {/* Amazon-Style 3-Column Dense Product Layout */}
        <div className="pdp-amazon-grid">
          {/* Column 1: Multi-Image Interactive Gallery & Zoom */}
          <div className="pdp-col-gallery">
            <ProductGallery product={product} />

            {/* Quick Guarantees beneath image */}
            <div className="pdp-gallery-trust-badges">
              <div className="gallery-trust-item">
                <Truck size={17} className="text-[#2e2a63]" />
                <span>Express 24-48h Delivery</span>
              </div>
              <div className="gallery-trust-item">
                <Banknote size={17} className="text-[#2e2a63]" />
                <span>Cash on Delivery</span>
              </div>
              <div className="gallery-trust-item">
                <RotateCcw size={17} className="text-[#2e2a63]" />
                <span>7-Day Return Service</span>
              </div>
            </div>
          </div>

          {/* Column 2: Dense Core Product Information & Specifications */}
          <div className="pdp-col-details">
            {/* Brand Store Link */}
            <div className="pdp-brand-row">
              <Link href={`/products?query=${encodeURIComponent(product.brand || "Arozao")}`} className="brand-store-link">
                Visit the {product.brand || "Arozao"} Store
              </Link>
              {product.sellerName && (
                <span className="verified-seller-badge">
                  <ShieldCheck size={13} className="text-emerald-600 inline mr-1" />
                  Verified Merchant: {product.sellerName}
                </span>
              )}
            </div>

            {/* Product Title */}
            <h1 className="pdp-dense-title">{product.name}</h1>

            {/* Ratings & Social Proof Bar */}
            <div className="pdp-ratings-bar">
              <div className="stars-cluster">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    fill={s <= Math.round(product.rating || 4.7) ? "#f1840e" : "none"}
                    className={s <= Math.round(product.rating || 4.7) ? "text-[#f1840e]" : "text-gray-300"}
                  />
                ))}
                <span className="rating-score-num">{product.rating || 4.7}</span>
              </div>
              <span className="rating-sep">|</span>
              <a href="#customer-reviews" className="reviews-jump-link">
                {product.reviewCount || 36} ratings
              </a>
              <span className="rating-sep">|</span>
              <span className="sku-badge">SKU: {product.sku || product.id}</span>
            </div>

            <hr className="pdp-divider" />

            {/* Price Box */}
            <div className="pdp-dense-price-box">
              <div className="deal-price-row">
                <span className="price-tag-label">Deal Price:</span>
                <span className="main-price-currency">৳</span>
                <span className="main-price-num">{price.toLocaleString()}</span>
                {hasDiscount && (
                  <span className="regular-price-strike">৳{regularPrice.toLocaleString()}</span>
                )}
              </div>

              {hasDiscount && (
                <div className="savings-row">
                  <span className="savings-tag">Save ৳{savings.toLocaleString()} ({product.discount}%)</span>
                </div>
              )}
              <span className="tax-inclusive-note">Inclusive of all local taxes and merchant fees</span>
            </div>

            <hr className="pdp-divider" />

            {/* Key Features Bullet List */}
            {product.features && product.features.length > 0 && (
              <div className="pdp-dense-features">
                <h3 className="features-heading">About this item</h3>
                <ul className="features-bullet-list">
                  {product.features.map((feat) => (
                    <li key={feat} className="feature-bullet-item">
                      <span className="bullet-point">▸</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Product Description */}
            <div className="pdp-dense-desc-block">
              <h3 className="desc-heading">Product Overview</h3>
              <p className="desc-body-text">{product.description || product.shortDescription}</p>
            </div>

            {/* Technical Specifications Table */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="pdp-dense-specs-block">
                <h3 className="specs-heading">Technical Specifications</h3>
                <div className="specs-table-grid">
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="specs-table-row">
                      <span className="spec-key">{key}</span>
                      <span className="spec-val">{val}</span>
                    </div>
                  ))}
                  <div className="specs-table-row">
                    <span className="spec-key">Category</span>
                    <span className="spec-val">{product.category.replace(/-/g, " ")}</span>
                  </div>
                  <div className="specs-table-row">
                    <span className="spec-key">Delivery</span>
                    <span className="spec-val">Nationwide (2–4 Business Days)</span>
                  </div>
                  <div className="specs-table-row">
                    <span className="spec-key">Warranty</span>
                    <span className="spec-val">7-Day Replacement Guarantee</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Dedicated Sticky Buy Box */}
          <div className="pdp-col-buybox">
            <ProductBuyBox product={product} />
          </div>
        </div>

        {/* Customer Reviews & Breakdown Section */}
        <ProductReviewsSection product={product} />

        {/* You May Also Like Section */}
        {relatedProducts.length > 0 && (
          <section className="pdp-related-showcase" aria-label="Related Products">
            <div className="section-header-row">
              <div>
                <span className="section-eyebrow">Discover Related Selections</span>
                <h2 className="section-main-title">You May Also Like</h2>
              </div>
              <Link
                href={`/products?category=${product.category}`}
                className="section-explore-link"
              >
                <span>View All {product.category.replace(/-/g, " ")}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <div className="content-grid products-home-grid">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.slug} product={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
