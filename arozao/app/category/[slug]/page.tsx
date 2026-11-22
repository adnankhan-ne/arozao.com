import { notFound } from "next/navigation";
import {
  getCategoryBySlugFromDb,
  products as staticProducts,
} from "@/lib/products";
import { ProductListing } from "@/components/ProductListing";
import type { Metadata } from "next";
import type { Product } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategoryBySlugFromDb(params.slug);
  return category
    ? {
        title: `${category.name} | Arozao`,
        description: `Explore our ${category.name} collection on Arozao Bangladesh.`,
        alternates: {
          canonical: `/category/${category.slug}`,
        },
      }
    : { title: "Category | Arozao" };
}

export default async function Category({
  params,
}: {
  params: { slug: string };
}) {
  const category = await getCategoryBySlugFromDb(params.slug);
  if (!category) notFound();

  const catalogProducts: Product[] = staticProducts.filter(
    (p) => p.status === "active" && p.category.toLowerCase() === params.slug.toLowerCase()
  );

  return (
    <main className="site-content" style={{ paddingTop: 16 }}>
      <ProductListing
        products={catalogProducts}
        initialCategory={params.slug}
      />
    </main>
  );
}
