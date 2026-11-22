import { NextRequest, NextResponse } from "next/server";
import { getCatalogProductsFromDb } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category")?.trim() || undefined;
    const subcategory = searchParams.get("subcategory")?.trim() || undefined;
    const brand = searchParams.get("brand")?.trim() || undefined;
    const query =
      (searchParams.get("q") || searchParams.get("query") || "").trim() ||
      undefined;

    const minPriceRaw = searchParams.get("minPrice");
    const maxPriceRaw = searchParams.get("maxPrice");
    const featuredRaw = searchParams.get("featured");
    const bestsellerRaw = searchParams.get("bestseller");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    const minPrice = minPriceRaw !== null ? Number(minPriceRaw) : undefined;
    const maxPrice = maxPriceRaw !== null ? Number(maxPriceRaw) : undefined;
    const featured =
      featuredRaw === "true"
        ? true
        : featuredRaw === "false"
        ? false
        : undefined;
    const bestseller =
      bestsellerRaw === "true"
        ? true
        : bestsellerRaw === "false"
        ? false
        : undefined;
    const limit = limitRaw !== null ? Number(limitRaw) : 100;
    const offset = offsetRaw !== null ? Number(offsetRaw) : 0;

    const result = await getCatalogProductsFromDb({
      category,
      subcategory,
      brand,
      query,
      minPrice,
      maxPrice,
      featured,
      bestseller,
      limit,
      offset,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      limit,
      offset,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load products.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = {
      id: `prod_${Date.now()}`,
      ...body,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({ ok: true, product: created }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to create product." }, { status: 400 });
  }
}
