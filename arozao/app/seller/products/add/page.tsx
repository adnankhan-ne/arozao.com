"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSellerProductOnServer } from "@/lib/seller";

interface SellerCategoryOption {
  id: string;
  name: string;
  slug: string;
}

export default function SellerAddProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<SellerCategoryOption[]>([]);
  const [price, setPrice] = useState<number>(2490);
  const [regularPrice, setRegularPrice] = useState<number>(2990);
  const [stock, setStock] = useState<number>(30);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/seller/products", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data?.ok || !Array.isArray(data.categories)) {
          throw new Error(data?.error || "Unable to load product categories.");
        }
        if (!cancelled) {
          setCategories(data.categories);
          setCategory((current) =>
            data.categories.some(
              (option: SellerCategoryOption) => option.slug === current
            )
              ? current
              : data.categories[0]?.slug || ""
          );
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load product categories."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Please enter a valid product title.");
      return;
    }

    if (Number(price) <= 0 || Number(stock) < 0) {
      setErrorMessage(
        "Price must be positive and stock quantity cannot be negative."
      );
      return;
    }

    setIsSubmitting(true);
    const res = await createSellerProductOnServer({
      name: name.trim(),
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      category,
      price: Number(price),
      regularPrice: Math.max(Number(regularPrice) || Number(price), Number(price)),
      salePrice: Number(price),
      stock: Math.max(0, Math.floor(Number(stock))),
      description:
        description.trim() || `${name.trim()} — available on Arozao Bangladesh.`,
      status: Number(stock) > 0 ? "active" : "out-of-stock",
      image,
    });

    setIsSubmitting(false);

    if (!res.ok) {
      setErrorMessage(
        res.error || "Failed to publish product. Please verify your inputs."
      );
      return;
    }

    router.push("/seller/products");
  };

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <div>
          <Link href="/seller/products" className="btn btn-link px-0 text-decoration-none">
            &larr; Back to Products
          </Link>
          <h1 className="h3 fw-bold mb-2">Add New Product to Store</h1>
          <p className="text-secondary mb-0">
            Fill in the item details, pricing in BDT, inventory count, and
            media.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="p-name">
              Product Title <span className="req">*</span>
            </label>
            <input
              id="p-name"
              className="form-control"
              type="text"
              required
              placeholder="e.g. Ultra Slim MagSafe Power Bank 10,000mAh"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!sku) {
                  setSku(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "-")
                      .slice(0, 12)
                  );
                }
              }}
            />
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold" htmlFor="p-sku">SKU Code</label>
              <input
                id="p-sku"
                className="form-control"
                type="text"
                placeholder="e.g. PB-MAG-10K-BLK"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold" htmlFor="p-cat">
                Product Category <span className="req">*</span>
              </label>
              <select
                id="p-cat"
                className="form-select"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map((option) => (
                  <option key={option.id} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold" htmlFor="p-price">
                Selling Price (৳ BDT) <span className="req">*</span>
              </label>
              <input
                id="p-price"
                className="form-control"
                type="number"
                required
                min={1}
                value={price}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPrice(val);
                  if (regularPrice < val) setRegularPrice(val);
                }}
              />
            </div>

            <div className="col-12 col-md-6 mb-3">
              <label className="form-label fw-semibold" htmlFor="p-reg-price">Regular MRP Price (৳ BDT)</label>
              <input
                id="p-reg-price"
                className="form-control"
                type="number"
                min={1}
                value={regularPrice}
                onChange={(e) => setRegularPrice(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="p-stock">
              Initial Stock Quantity <span className="req">*</span>
            </label>
            <input
              id="p-stock"
              className="form-control"
              type="number"
              required
              min={0}
              value={stock}
              onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="p-desc">Product Description</label>
            <textarea
              id="p-desc"
              className="form-control"
              rows={3}
              placeholder="Describe specifications, warranty, and package contents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="p-img">Product Image URL</label>
            <input
              id="p-img"
              className="form-control"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
            <small className="d-block text-secondary mt-1">
              Provide a direct image URL or choose a preset sample below.
            </small>

            <div className="d-flex flex-wrap gap-2 mt-2">
              {[
                {
                  label: "Power Bank",
                  url: "https://images.unsplash.com/photo-1609592424364-589626e2e505?auto=format&fit=crop&w=400&q=80",
                },
                {
                  label: "Smart Watch",
                  url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80",
                },
                {
                  label: "Earbuds",
                  url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=400&q=80",
                },
                {
                  label: "Desk Lamp",
                  url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=400&q=80",
                },
              ].map((p) => (
                <button
                  type="button"
                  key={p.label}
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setImage(p.url)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-4">
            <Link href="/seller/products" className="btn btn-outline-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || categories.length === 0}
            >
              {isSubmitting
                ? "Publishing to Marketplace..."
                : "Publish Product to Arozao"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
