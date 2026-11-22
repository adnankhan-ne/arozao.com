import { products as staticProducts } from "@/lib/products";
import { HeroCarousel } from "@/components/HeroCarousel";
import { BentoCategoryGrid } from "@/components/BentoCategoryGrid";
import { CategoryQuadGrid } from "@/components/CategoryQuadGrid";
import { Product } from "@/types";

export const revalidate = 60;

export default async function Home() {
  const allCatalogProducts: Product[] = staticProducts;

  return (
    <div className="home-root">
      {/* 1. Cinematic Apple/Linear Grade Hero with Scroll Parallax */}
      <HeroCarousel />

      {/* 2. Main Content Container */}
      <main className="home-container">
        {/* Curated Bento Categories Showcase (Preserved in original place) */}
        <BentoCategoryGrid />

        {/* 12 Square Category Quad Boxes (4 Products each, replacing the previous Featured Products section) */}
        <CategoryQuadGrid catalogProducts={allCatalogProducts} />
      </main>
    </div>
  );
}
