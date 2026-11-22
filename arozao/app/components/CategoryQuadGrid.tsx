"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Product } from "@/types";

export interface CategoryQuadBoxData {
  id: string;
  name: string;
  tag: string;
  link: string;
  products: Array<{
    name: string;
    slug: string;
    price: number;
    thumbnail: string;
  }>;
}

interface CategoryQuadGridProps {
  catalogProducts: Product[];
}

export function CategoryQuadGrid({ catalogProducts }: CategoryQuadGridProps) {
  const boxes: CategoryQuadBoxData[] = useMemo(() => {
    const usedSlugs = new Set<string>();

    const getItems = (filter: (p: Product) => boolean, count = 4) => {
      const result: Array<{
        name: string;
        slug: string;
        price: number;
        thumbnail: string;
      }> = [];

      for (const p of catalogProducts) {
        if (filter(p) && !usedSlugs.has(p.slug) && (p.thumbnail || p.image)) {
          usedSlugs.add(p.slug);
          result.push({
            name: p.name,
            slug: p.slug,
            price: p.salePrice ?? p.price,
            thumbnail: p.thumbnail || p.image,
          });
          if (result.length === count) break;
        }
      }

      // If fewer than count, allow non-exclusive items so every box has 4 items
      if (result.length < count) {
        for (const p of catalogProducts) {
          if (filter(p) && !result.some((r) => r.slug === p.slug) && (p.thumbnail || p.image)) {
            result.push({
              name: p.name,
              slug: p.slug,
              price: p.salePrice ?? p.price,
              thumbnail: p.thumbnail || p.image,
            });
            if (result.length === count) break;
          }
        }
      }

      return result;
    };

    const categoryDefinitions = [
      {
        id: "smart-devices",
        name: "Smart Devices & Wearables",
        tag: "Gadgets",
        link: "/products?category=gadgets",
        filter: (p: Product) =>
          (p.subcategory === "smart-devices" ||
            p.category === "gadgets" ||
            p.subcategory === "Wearables") &&
          !p.name.toLowerCase().includes("speaker"),
      },
      {
        id: "audio-sound",
        name: "Audio & Wireless Sound",
        tag: "Audio",
        link: "/products?query=audio",
        filter: (p: Product) =>
          p.subcategory === "audio" ||
          p.subcategory === "Audio" ||
          p.name.toLowerCase().includes("speaker") ||
          p.name.toLowerCase().includes("headphone"),
      },
      {
        id: "phone-accessories",
        name: "Phone & Mobile Accessories",
        tag: "Mobile",
        link: "/products?category=phone-accessories",
        filter: (p: Product) =>
          p.subcategory === "mobile-accessories" ||
          p.category === "phone-accessories" ||
          p.subcategory === "Cases",
      },
      {
        id: "kitchen-appliances",
        name: "Kitchenware & Appliances",
        tag: "Kitchen",
        link: "/products?category=kitchen-appliances",
        filter: (p: Product) =>
          p.category === "kitchen" ||
          p.category === "kitchen-appliances" ||
          p.subcategory === "Cookware",
      },
      {
        id: "home-decor",
        name: "Home Decor & Lighting",
        tag: "Interiors",
        link: "/products?category=home-decor",
        filter: (p: Product) =>
          (p.subcategory === "home-decor" ||
            p.category === "home-decor" ||
            p.subcategory === "Lighting") &&
          !p.name.toLowerCase().includes("jersey"),
      },
      {
        id: "skincare-beauty",
        name: "Skincare & Beauty Care",
        tag: "Skincare",
        link: "/products?category=girls-fashion",
        filter: (p: Product) =>
          p.subcategory === "skincare" ||
          p.subcategory === "Beauty" ||
          p.name.toLowerCase().includes("cetaphil"),
      },
      {
        id: "haircare-grooming",
        name: "Personal Care & Grooming",
        tag: "Wellness",
        link: "/products?category=beauty",
        filter: (p: Product) =>
          p.subcategory === "haircare" ||
          p.subcategory === "personal-care" ||
          p.name.toLowerCase().includes("kemei") ||
          p.name.toLowerCase().includes("hair"),
      },
      {
        id: "bags-backpacks",
        name: "Bags, Backpacks & Travel",
        tag: "Travel",
        link: "/products?query=bag",
        filter: (p: Product) =>
          p.subcategory === "bags" || p.name.toLowerCase().includes("bag"),
      },
      {
        id: "fashion-footwear",
        name: "Activewear & Footwear",
        tag: "Fashion",
        link: "/products?category=boys-fashion",
        filter: (p: Product) =>
          p.category === "boys-fashion" ||
          p.subcategory === "Shoes" ||
          p.name.toLowerCase().includes("jersey") ||
          p.name.toLowerCase().includes("sneaker"),
      },
      {
        id: "computer-desk",
        name: "Computer & Workspace",
        tag: "Workspace",
        link: "/products?category=computer-accessories",
        filter: (p: Product) =>
          p.subcategory === "computer-accessories" ||
          p.category === "computer-accessories" ||
          p.subcategory === "Keyboards" ||
          p.name.toLowerCase().includes("stand"),
      },
      {
        id: "home-living",
        name: "Home Living & Comfort",
        tag: "Living",
        link: "/products?category=lifestyle",
        filter: (p: Product) =>
          p.category === "lifestyle" ||
          p.subcategory === "Bedding" ||
          p.category === "showpieces" ||
          p.subcategory === "storage" ||
          p.category === "home",
      },
      {
        id: "daily-essentials",
        name: "Everyday Modern Tools",
        tag: "Essentials",
        link: "/products",
        filter: (p: Product) =>
          p.category === "general" &&
          (p.name.toLowerCase().includes("machine") ||
            p.name.toLowerCase().includes("cutter") ||
            p.name.toLowerCase().includes("frother") ||
            p.name.toLowerCase().includes("gripper") ||
            p.name.toLowerCase().includes("fan")),
      },
    ];

    return categoryDefinitions.map((def) => ({
      id: def.id,
      name: def.name,
      tag: def.tag,
      link: def.link,
      products: getItems(def.filter, 4),
    }));
  }, [catalogProducts]);

  return (
    <section className="category-quad-section" aria-label="12 Curated Department Quad Boxes">
      <div className="section-header-row">
        <div>
          <span className="section-eyebrow">
            <Sparkles size={13} className="inline-block mr-1 text-[#f1840e]" />
            Department Highlights · 12 Curated Boxes
          </span>
          <h2 className="section-main-title">Shop by Category</h2>
        </div>
        <Link href="/products" className="section-explore-link">
          <span>View All Departments</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {/* 12-Box Square Category Quad Grid */}
      <div className="category-quad-grid">
        {boxes.map((box) => (
          <article key={box.id} className="category-quad-card">
            {/* Box Header: Category Name & Tag */}
            <div className="quad-card-header">
              <h3 className="quad-card-title">{box.name}</h3>
              <span className="quad-card-tag">{box.tag}</span>
            </div>

            {/* 2x2 Grid of 4 Products */}
            <div className="quad-products-grid">
              {box.products.map((item) => (
                <Link
                  key={item.slug}
                  href={`/product/${item.slug}`}
                  className="quad-item-link"
                  title={item.name}
                >
                  <div className="quad-item-media">
                    <Image
                      src={item.thumbnail}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 150px"
                      referrerPolicy="no-referrer"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div className="quad-item-info">
                    <span className="quad-item-name">{item.name}</span>
                    <span className="quad-item-price">৳{item.price.toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Box Footer CTA */}
            <div className="quad-card-footer">
              <Link href={box.link} className="quad-explore-link">
                <span>Explore {box.name}</span>
                <ArrowRight size={13} aria-hidden="true" className="quad-arrow-icon" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
