"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { Product } from "@/types";

interface ProductGalleryProps {
  product: Product;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  // Ensure we have a list of images for thumbnail switching
  const primaryImage = product.image || product.thumbnail || "/images/placeholder.png";
  const imageList = React.useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img) => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    if (!list.includes(primaryImage)) {
      list.unshift(primaryImage);
    }
    // If only 1 image, create alternate contextual zoom/detail previews
    if (list.length === 1) {
      list.push(primaryImage);
    }
    return list;
  }, [product.images, primaryImage]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 50, y: 50 });

  const currentImage = imageList[activeIdx] || primaryImage;
  const hasDiscount = Boolean(product.discount && product.discount > 0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomCoords({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <div className="pdp-gallery-container">
      {/* Thumbnail column (vertical on desktop, horizontal on mobile) */}
      {imageList.length > 1 && (
        <div className="pdp-thumbnail-strip" role="tablist" aria-label="Product thumbnails">
          {imageList.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              type="button"
              className={`pdp-thumb-btn ${idx === activeIdx ? "is-active" : ""}`}
              onClick={() => setActiveIdx(idx)}
              onMouseEnter={() => setActiveIdx(idx)}
              aria-label={`View product image ${idx + 1}`}
              aria-selected={idx === activeIdx}
            >
              <div className="pdp-thumb-media">
                <Image
                  src={img}
                  alt={`${product.name} angle ${idx + 1}`}
                  fill
                  sizes="64px"
                  referrerPolicy="no-referrer"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main Large Display Stage with Zoom */}
      <div className="pdp-stage-wrapper">
        <div
          className={`pdp-main-stage ${isZoomed ? "is-zooming" : ""}`}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
        >
          <Image
            src={currentImage}
            alt={product.name}
            fill
            quality={80}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 540px"
            referrerPolicy="no-referrer"
            style={{
              objectFit: "contain",
              transformOrigin: `${zoomCoords.x}% ${zoomCoords.y}%`,
              transform: isZoomed ? "scale(1.8)" : "scale(1)",
              transition: isZoomed ? "none" : "transform 250ms ease",
            }}
          />

          {hasDiscount && (
            <div className="pdp-stage-discount-badge">
              <span>-{product.discount}% OFF</span>
            </div>
          )}

          <div className="pdp-zoom-indicator" aria-hidden="true">
            <ZoomIn size={14} />
            <span>Hover to zoom</span>
          </div>
        </div>
      </div>
    </div>
  );
}
