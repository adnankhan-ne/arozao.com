"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight } from "lucide-react";

interface BentoCardData {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  href: string;
  label: string;
  image: string;
  badge?: string;
  spanClass: string;
  itemCount?: string;
}

const bentoItems: BentoCardData[] = [
  {
    id: "smart-tech",
    title: "Next-Gen Smart Tech & Wearables",
    subtitle: "Active noise-canceling earbuds, fitness smartwatches, and magnetic desktop chargers.",
    tag: "Electronics & Gadgets",
    href: "/products?category=gadgets",
    label: "Explore Smart Tech",
    image: "/images/curated_smart_tech_1792953679276.jpg",
    badge: "⚡ Same-Day Dhaka Dispatch",
    spanClass: "bento-card-wide-lg",
    itemCount: "49+ Items",
  },
  {
    id: "fashion",
    title: "Modern Apparel & Footwear",
    subtitle: "Breathable textured fabrics, everyday structured casuals, and seasonal essentials.",
    tag: "Curated Style",
    href: "/products?category=boys-fashion",
    label: "Browse Fashion",
    image: "/images/curated_modern_apparel_1792953679771.jpg",
    badge: "New 2026 Collection",
    spanClass: "bento-card-portrait",
    itemCount: "38+ Styles",
  },
  {
    id: "audio",
    title: "High-Fidelity Studio Audio",
    subtitle: "Precision acoustic transducers, studio monitor headphones, and low-latency DACs.",
    tag: "Studio Acoustics",
    href: "/products?query=audio",
    label: "Discover Sound",
    image: "/images/curated_studio_audio_1792953679755.jpg",
    badge: "Audiophile Grade",
    spanClass: "bento-card-portrait",
    itemCount: "24+ Models",
  },
  {
    id: "kitchen",
    title: "Artisan Kitchenware & Coffee Gear",
    subtitle: "Cast iron Dutch ovens, ceramic pour-over carafes, and precision culinary tools made to last.",
    tag: "Culinary & Dining",
    href: "/products?category=kitchen-appliances",
    label: "Shop Kitchen Essentials",
    image: "/images/curated_artisan_kitchen_1792953737410.jpg",
    badge: "Artisan Craftsmanship",
    spanClass: "bento-card-wide-md",
    itemCount: "22+ Essentials",
  },
  {
    id: "home-living",
    title: "Architectural Living & Lighting",
    subtitle: "Minimalist oak furniture, ambient brass illumination, and tactile ceramic home accents.",
    tag: "Interiors & Decor",
    href: "/products?category=home-decor",
    label: "Explore Living Spaces",
    image: "/images/curated_home_living_1792953679508.jpg",
    badge: "Scandinavian Design",
    spanClass: "bento-card-wide-md",
    itemCount: "32+ Accents",
  },
];

const categoryPills = [
  { label: "All Catalog", href: "/products" },
  { label: "Smart Tech (49)", href: "/products?category=gadgets" },
  { label: "Apparel (38)", href: "/products?category=boys-fashion" },
  { label: "Studio Audio (24)", href: "/products?query=audio" },
  { label: "Kitchenware (22)", href: "/products?category=kitchen-appliances" },
  { label: "Home Decor (32)", href: "/products?category=home-decor" },
];

export function BentoCategoryGrid() {
  return (
    <section className="bento-showcase-section" aria-label="Product Categories Bento Showcase">
      {/* Quick Category Navigation Strip */}
      <nav className="bento-nav-strip" aria-label="Department quick links">
        {categoryPills.map((pill, idx) => (
          <Link
            key={pill.label}
            href={pill.href}
            className={`bento-nav-pill ${idx === 0 ? "is-featured" : ""}`}
          >
            <span>{pill.label}</span>
            <ChevronRight size={13} aria-hidden="true" className="bento-nav-chevron" />
          </Link>
        ))}
      </nav>

      {/* 5-Block Asymmetric Bento Grid */}
      <div className="bento-asymmetric-grid">
        {bentoItems.map((item) => (
          <article key={item.id} className={`bento-tile ${item.spanClass}`}>
            <Link href={item.href} className="bento-tile-link" aria-label={`${item.title} - ${item.label}`}>
              {/* Image Container with Smooth Scaling */}
              <div className="bento-tile-media">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 650px"
                  referrerPolicy="no-referrer"
                  style={{ objectFit: "cover" }}
                  className="bento-tile-img"
                  priority={item.id === "smart-tech"}
                />
                {/* Multi-Stop Atmospheric Gradient Scrim for Contrast & Legibility */}
                <div className="bento-tile-scrim" />
              </div>

              {/* Floating Top Badge */}
              <div className="bento-tile-top-bar">
                <span className="bento-kicker-tag">{item.tag}</span>
                {item.badge && (
                  <span className="bento-highlight-badge">{item.badge}</span>
                )}
              </div>

              {/* Bottom Content & Call-to-Action */}
              <div className="bento-tile-bottom-content">
                <div className="bento-title-row">
                  <h3 className="bento-tile-title">{item.title}</h3>
                  {item.itemCount && (
                    <span className="bento-item-counter">{item.itemCount}</span>
                  )}
                </div>
                <p className="bento-tile-desc">{item.subtitle}</p>

                {/* Explicit Interactive Call-to-Action Button */}
                <div className="bento-action-button">
                  <span className="bento-action-label">{item.label}</span>
                  <div className="bento-action-circle" aria-hidden="true">
                    <ArrowRight size={14} className="bento-action-icon" />
                  </div>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
