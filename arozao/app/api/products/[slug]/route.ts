import { NextRequest, NextResponse } from "next/server";
import { getProductBySlugFromDb } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug?.trim();
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Product slug is required." },
        { status: 400 }
      );
    }

    const product = await getProductBySlugFromDb(slug);
    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      product,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load product.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await req.json();
    const existing = await getProductBySlugFromDb(params.slug);
    return NextResponse.json({
      ok: true,
      product: {
        ...(existing || {}),
        ...body,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update product." }, { status: 400 });
  }
}
