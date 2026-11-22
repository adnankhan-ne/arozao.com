"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";

const slides = [
  {
    category: "Smart Tech & Wearables",
    subtitle: "Precision gadgets, smartwatches, and wireless audio crafted for modern life.",
    image: "/images/curated_smart_tech_1792953679276.jpg",
    href: "/products?category=gadgets",
    tag: "Curated Electronics",
  },
  {
    category: "Trending Styles & Footwear",
    subtitle: "Everyday comfort with effortless elegance and tailored craftsmanship.",
    image: "/images/curated_modern_apparel_1792953679771.jpg",
    href: "/products?category=boys-fashion",
    tag: "Modern Wardrobe",
  },
  {
    category: "Home & Workspace Essentials",
    subtitle: "Minimalist Scandinavian design, ambient lighting, and organic textures.",
    image: "/images/curated_home_living_1792953679508.jpg",
    href: "/products?category=home-decor",
    tag: "Interiors & Living",
  },
  {
    category: "Premium Audio & Sound",
    subtitle: "Acoustic precision and immersive noise-canceling studio hardware.",
    image: "/images/curated_studio_audio_1792953679755.jpg",
    href: "/products?query=audio",
    tag: "Studio Acoustics",
  },
  {
    category: "Modern Kitchen & Living",
    subtitle: "Artisan cookware, ceramic sets, and culinary tools made to endure.",
    image: "/images/curated_artisan_kitchen_1792953737410.jpg",
    href: "/products?category=kitchen-appliances",
    tag: "Culinary Craft",
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLElement | null>(null);

  // Smooth parallax animation on scroll via motion/react
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.15]);

  // Smooth continuous automatic slide transition every 5.5 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  const currentSlide = slides[active];
  const slideNum = (active + 1).toString().padStart(2, "0");
  const totalNum = slides.length.toString().padStart(2, "0");

  return (
    <section
      ref={containerRef}
      className="hero"
      aria-label="Promotions and Featured Offers"
    >
      {/* Parallax Background Container */}
      <motion.div
        className="hero-parallax-wrapper"
        style={{ y: imageY, scale: imageScale }}
        aria-hidden="true"
      >
        <div className="hero-slides">
          {slides.map((slide, index) => {
            const isActive = index === active;
            return (
              <div
                key={slide.image}
                className={`hero-slide ${isActive ? "active" : ""}`}
              >
                <Image
                  src={slide.image}
                  alt={slide.category}
                  fill
                  quality={95}
                  priority={index <= 1}
                  sizes="100vw"
                  referrerPolicy="no-referrer"
                  style={{ objectFit: "cover" }}
                />
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Cinematic Linear & Apple-grade Gradient Scrim for Impeccable Text Contrast */}
      <div className="hero-overlay" />

      {/* Modern Linear & Stripe-grade Hero Content with Parallax & Strict Typography */}
      <motion.div
        className="hero-content"
        style={{ y: contentY, opacity: contentOpacity }}
        key={active}
      >
        <div className="hero-kicker-row">
          <span className="hero-counter-num">{slideNum} / {totalNum}</span>
          <span className="hero-kicker-sep">·</span>
          <span className="hero-kicker-tag">{currentSlide.tag}</span>
          <span className="hero-kicker-sep">·</span>
          <span className="hero-kicker-sub">Bangladesh Verified Marketplace</span>
        </div>

        <h1 className="hero-category-title">{currentSlide.category}</h1>
        <p className="hero-category-subtitle">{currentSlide.subtitle}</p>

        <div className="hero-action-row">
          <Link href={currentSlide.href} className="hero-cta-btn">
            <span>Explore Collection</span>
            <ArrowRight size={16} aria-hidden="true" className="hero-arrow-icon" />
          </Link>
          <Link href="/products" className="hero-secondary-cta">
            <span>Browse Full Catalog</span>
            <ArrowRight size={14} aria-hidden="true" className="hero-sec-arrow" />
          </Link>
        </div>

        {/* Linear-grade quiet visual progress track */}
        <div className="hero-progress-track" aria-hidden="true">
          {slides.map((slide, idx) => (
            <div
              key={slide.image}
              className={`hero-track-segment ${idx === active ? "is-active" : ""}`}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
