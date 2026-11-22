import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slugOrId = searchParams.get("slug") || searchParams.get("productId") || "";

  return NextResponse.json({
    ok: true,
    productId: slugOrId,
    rating: 4.8,
    reviewCount: 0,
    reviews: [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ok: true,
      message: "Review submitted successfully.",
      review: {
        id: `rev_${Date.now()}`,
        ...body,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to submit review." }, { status: 400 });
  }
}
