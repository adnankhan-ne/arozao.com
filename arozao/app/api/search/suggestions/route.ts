import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/products";
import { productMatches, scoreProduct } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || searchParams.get("query") || "").trim();
  const category = (searchParams.get("category") || "").trim();

  if (!q) {
    return NextResponse.json({ suggestions: [] });
  }

  const matches = products
    .filter((product) => productMatches(product, q, category))
    .sort((a, b) => scoreProduct(b, q) - scoreProduct(a, q))
    .slice(0, 8)
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      salePrice: product.salePrice ?? product.price,
      thumbnail:
        product.thumbnail ||
        product.image ||
        (product.images && product.images[0]) ||
        "",
      category: product.category,
      brand: product.brand,
    }));

  return NextResponse.json(
    { suggestions: matches },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}
