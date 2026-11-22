import { ProductListing } from "@/components/ProductListing";
import { products as staticProducts } from "@/lib/products";
import type { Product } from "@/types";

export default async function Products({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const query = searchParams.query || searchParams.q || "";
  const catalogProducts: Product[] = staticProducts.filter((p) => p.status === "active");

  return (
    <main className="site-content" style={{ paddingTop: 16 }}>
      <ProductListing
        products={catalogProducts}
        initialQuery={query}
        initialCategory={searchParams.category}
        initialSubcategory={searchParams.subcategory}
      />
    </main>
  );
}
