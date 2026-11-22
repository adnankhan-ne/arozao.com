import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

type PhpEnvelope = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: unknown;
  pagination?: unknown;
};

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}

function asRecords(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value ? value : fallback;
}

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapProduct(row: RecordValue) {
  const rawStatus = asText(row.status).toLowerCase();
  return {
    id: String(row.id ?? ""),
    slug: asText(row.slug),
    name: asText(row.name, "Untitled product"),
    sku: asText(row.sku),
    category: asText(row.category_slug, asText(row.category_name, "uncategorized")),
    price: asNumber(row.sale_price || row.regular_price),
    regularPrice: asNumber(row.regular_price),
    salePrice: asNumber(row.sale_price || row.regular_price),
    stock: asNumber(row.stock),
    status:
      rawStatus === "out_of_stock"
        ? "out-of-stock"
        : rawStatus === "active"
        ? "active"
        : rawStatus === "archived"
        ? "archived"
        : "draft",
    salesCount: asNumber(row.total_sold),
    image: asText(row.primary_image, "/images/product-placeholder.svg"),
    description: asText(row.description),
    createdAt: asText(row.created_at),
  };
}

async function loadProducts(request: NextRequest) {
  const response = await fetchPhpApi(request, "seller/products?per_page=100");
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success) {
    return {
      error: payload.message || payload.error || "Failed to load seller products.",
      status: response.status || 502,
    };
  }
  return {
    products: asRecords(payload.data).map(mapProduct),
    pagination: asRecord(payload.pagination),
  };
}

async function findCategoryId(request: NextRequest, category: string) {
  const response = await fetchPhpApi(request, "categories");
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success) {
    return {
      error: payload.message || payload.error || "Unable to load product categories.",
      status: response.status || 502,
    };
  }

  const normalized = category.trim().toLowerCase();
  const found = asRecords(payload.data).find((row) =>
    [row.slug, row.name]
      .some((value) => asText(value).trim().toLowerCase() === normalized)
  );
  if (!found) {
    return {
      error: "Select a valid product category before saving.",
      status: 422,
    };
  }
  return { categoryId: asNumber(found.id) };
}

export async function GET(request: NextRequest) {
  const [productsResult, categoriesResponse] = await Promise.all([
    loadProducts(request),
    fetchPhpApi(request, "categories"),
  ]);
  if ("error" in productsResult) {
    return NextResponse.json(
      { ok: false, error: productsResult.error },
      { status: productsResult.status }
    );
  }

  const categoriesPayload = (await categoriesResponse.json()) as PhpEnvelope;
  if (!categoriesResponse.ok || !categoriesPayload.success) {
    return NextResponse.json(
      {
        ok: false,
        error: categoriesPayload.message || "Unable to load product categories.",
      },
      { status: categoriesResponse.status || 502 }
    );
  }

  const categories = asRecords(categoriesPayload.data).map((category) => ({
    id: String(category.id ?? ""),
    name: asText(category.name),
    slug: asText(category.slug),
  }));
  const { products, pagination } = productsResult;
  return NextResponse.json({
    ok: true,
    products,
    count: asNumber(pagination.total) || products.length,
    categories,
  });
}

export async function POST(request: NextRequest) {
  let body: RecordValue;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid JSON product is required." },
      { status: 400 }
    );
  }

  const category = await findCategoryId(request, asText(body.category));
  if ("error" in category) {
    return NextResponse.json(
      { ok: false, error: category.error },
      { status: category.status }
    );
  }

  const backendResponse = await fetchPhpApi(
    request,
    "seller/products",
    {
      name: body.name,
      sku: body.sku,
      category_id: category.categoryId,
      regular_price: body.regularPrice ?? body.price,
      sale_price: body.salePrice ?? body.price,
      stock: body.stock,
      description: body.description,
      image_url: body.image,
    },
    "POST"
  );
  const payload = (await backendResponse.json()) as PhpEnvelope;
  if (!backendResponse.ok || !payload.success) {
    return NextResponse.json(
      { ok: false, error: payload.message || payload.error || "Failed to create product." },
      { status: backendResponse.status || 502 }
    );
  }
  return NextResponse.json(
    { ok: true, product: asRecord(payload.data) },
    { status: backendResponse.status }
  );
}

export async function PATCH(request: NextRequest) {
  let body: RecordValue;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid JSON update is required." },
      { status: 400 }
    );
  }

  const productId = asText(body.productId);
  if (!/^\d+$/.test(productId)) {
    return NextResponse.json(
      { ok: false, error: "A valid product ID is required." },
      { status: 400 }
    );
  }

  const updates: RecordValue = {};
  const fieldMap: Record<string, string> = {
    name: "name",
    description: "description",
    regularPrice: "regular_price",
    salePrice: "sale_price",
    stock: "stock",
    sku: "sku",
  };
  for (const [source, target] of Object.entries(fieldMap)) {
    if (body[source] !== undefined) updates[target] = body[source];
  }
  if (body.status !== undefined) {
    updates.status =
      body.status === "out-of-stock" ? "out_of_stock" : body.status;
  }
  if (body.image !== undefined) updates.image_url = body.image;
  if (body.category !== undefined) {
    const category = await findCategoryId(request, asText(body.category));
    if ("error" in category) {
      return NextResponse.json(
        { ok: false, error: category.error },
        { status: category.status }
      );
    }
    updates.category_id = category.categoryId;
  }

  const backendResponse = await fetchPhpApi(
    request,
    `seller/products/${productId}`,
    updates,
    "PUT"
  );
  const payload = (await backendResponse.json()) as PhpEnvelope;
  if (!backendResponse.ok || !payload.success) {
    return NextResponse.json(
      { ok: false, error: payload.message || payload.error || "Failed to update product." },
      { status: backendResponse.status || 502 }
    );
  }

  const freshProducts = await loadProducts(request);
  if ("error" in freshProducts) {
    return NextResponse.json(
      {
        ok: false,
        error: `Product was updated, but the catalog could not be refreshed: ${freshProducts.error}`,
      },
      { status: freshProducts.status }
    );
  }
  const product = freshProducts.products.find((item) => item.id === productId);
  if (!product) {
    return NextResponse.json(
      { ok: false, error: "Product was updated, but could not be found in the refreshed catalog." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, product });
}

export async function DELETE(request: NextRequest) {
  const productId = new URL(request.url).searchParams.get("productId") || "";
  if (!/^\d+$/.test(productId)) {
    return NextResponse.json(
      { ok: false, error: "A valid product ID is required." },
      { status: 400 }
    );
  }
  const response = await fetchPhpApi(
    request,
    `seller/products/${productId}`,
    undefined,
    "DELETE"
  );
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success) {
    return NextResponse.json(
      { ok: false, error: payload.message || payload.error || "Failed to archive product." },
      { status: response.status || 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
