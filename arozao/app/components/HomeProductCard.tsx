"use client";

import Link from "next/link";
import Image from "next/image";
import React, { memo } from "react";
import { Product } from "@/types";

export const HomeProductCard = memo(function HomeProductCard({
  product,
}: {
  product: Product;
}) {
  const price = product.salePrice ?? product.price;
  const regularPrice = product.price;
  const hasDiscount = Boolean(product.discount && product.discount > 0 && regularPrice > price);
  const imageSrc = product.thumbnail || product.image;
  const productHref = `/product/${product.slug}`;

  return (
    <article className="home-product-card">
      <Link href={productHref} className="home-product-link" aria-label={`View ${product.name}`}>
        <div className="home-product-media">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            referrerPolicy="no-referrer"
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className="home-product-body">
          <h3 className="home-product-title" title={product.name}>
            {product.name}
          </h3>

          <div className="home-product-pricing">
            <span className="home-product-price">৳{price.toLocaleString()}</span>
            {hasDiscount && (
              <span className="home-product-regular-price">
                ৳{regularPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
});
