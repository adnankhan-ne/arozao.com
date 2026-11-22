"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import {
  fetchSellerProductsFromServer,
  updateSellerProductOnServer,
  deleteSellerProductOnServer,
} from "@/lib/seller";
import { SellerProductItem } from "@/types/seller";

export default function SellerProductsPage() {
  const [products, setProducts] = useState<SellerProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("search") || ""
  );
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [editingProduct, setEditingProduct] =
    useState<SellerProductItem | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchSellerProductsFromServer();
      setProducts(list);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to load seller products."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const handlePanelSearch = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const query = (event as CustomEvent<{ query?: string }>).detail?.query;
      if (typeof query === "string") setSearch(query);
    };

    window.addEventListener("arozao-panel-search", handlePanelSearch);
    return () =>
      window.removeEventListener("arozao-panel-search", handlePanelSearch);
  }, []);

  const handleQuickUpdate = async (
    prod: SellerProductItem,
    updates: {
      price?: number;
      stock?: number;
      status?: SellerProductItem["status"];
    }
  ) => {
    setErrorMsg("");
    setNotice("");
    setSavingId(prod.id);

    const res = await updateSellerProductOnServer({
      productId: prod.id,
      ...updates,
    });
    setSavingId(null);

    if (!res.ok || !res.product) {
      setErrorMsg(res.error || "Failed to update product.");
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === prod.id
          ? { ...res.product!, salesCount: p.salesCount }
          : p
      )
    );
    setNotice(`Updated "${res.product.name}" in catalog.`);
    setTimeout(() => setNotice(""), 3000);
  };

  const handleModalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setErrorMsg("");
    setNotice("");
    setSavingId(editingProduct.id);

    const res = await updateSellerProductOnServer({
      productId: editingProduct.id,
      name: editingProduct.name,
      sku: editingProduct.sku,
      category: editingProduct.category,
      price: Number(editingProduct.price),
      regularPrice: Number(
        editingProduct.regularPrice ?? editingProduct.price
      ),
      salePrice: Number(editingProduct.price),
      stock: Math.max(0, Math.floor(Number(editingProduct.stock))),
      status: editingProduct.status,
      image: editingProduct.image,
      description: editingProduct.description,
    });

    setSavingId(null);

    if (!res.ok || !res.product) {
      setErrorMsg(res.error || "Failed to save product changes.");
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === editingProduct.id
          ? { ...res.product!, salesCount: p.salesCount }
          : p
      )
    );
    setEditingProduct(null);
    setNotice(`Saved changes to "${res.product.name}".`);
    setTimeout(() => setNotice(""), 3000);
  };

  const handleArchiveOrDelete = async (prod: SellerProductItem) => {
    setErrorMsg("");
    setNotice("");
    setSavingId(prod.id);

    const res = await deleteSellerProductOnServer(prod.id);
    setSavingId(null);

    if (!res.ok) {
      setErrorMsg(res.error || "Failed to remove product.");
      return;
    }

    await loadProducts();
    setNotice(`Removed/archived "${prod.name}".`);
    setTimeout(() => setNotice(""), 3000);
  };

  const filtered = products.filter((p) => {
    const name = String(p.name ?? "").toLowerCase();
    const sku = String(p.sku ?? "").toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch =
      name.includes(query) || sku.includes(query);
    const matchesCat =
      filterCategory === "all" || p.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <span className="badge rounded-pill bg-primary-subtle text-primary mb-2">
            Catalog &amp; Inventory Management
          </span>
          <h1 className="h3 fw-bold mb-2">My Products ({products.length})</h1>
          <p className="text-secondary mb-0">
            Manage your store inventory, BDT pricing, and product
            visibility on Arozao.
          </p>
        </div>
        <Link href="/seller/products/add" className="btn btn-primary">
          Add New Product
        </Link>
      </div>

      {notice && (
        <div className="alert alert-success rounded-3 mb-3" role="status">
          ✓ {notice}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="row g-2 bg-white border rounded-3 p-3 mb-3">
        <input
          type="text"
          placeholder="Search by product title or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-control col-12 col-lg"
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="form-select col-12 col-md"
        >
          <option value="all">All Categories</option>
          <option value="gadgets">Gadgets</option>
          <option value="phone-accessories">Phone Accessories</option>
          <option value="computer-accessories">Computer Accessories</option>
          <option value="home-decor">Home Decor</option>
          <option value="kitchen-appliances">Kitchen Appliances</option>
          <option value="lifestyle">Lifestyle</option>
          <option value="showpieces">Showpieces</option>
          <option value="girls-fashion">Girls Fashion</option>
          <option value="boys-fashion">Boys Fashion</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-select col-12 col-md"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="out-of-stock">Out of Stock</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle text-nowrap mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price (BDT)</th>
                <th>Inventory Stock</th>
                <th>Sales</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center p-5 text-secondary"
                  >
                    Loading your store catalog &amp; inventory...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((prod) => (
                  <tr key={prod.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Image
                          src={prod.image}
                          alt={prod.name}
                          width={44}
                          height={44}
                          referrerPolicy="no-referrer"
                          className="rounded-2 flex-shrink-0 object-fit-cover"
                        />
                        <div className="d-flex flex-column">
                          <strong className="text-wrap">{prod.name}</strong>
                          <small className="text-secondary">
                            Added{" "}
                            {new Date(prod.createdAt).toLocaleDateString(
                              "en-BD",
                              { day: "numeric", month: "short", year: "numeric" }
                            )}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code>{prod.sku}</code>
                    </td>
                    <td>
                      <span className="badge bg-light text-secondary">
                        {prod.category}
                      </span>
                    </td>
                    <td>
                      <strong>৳{prod.price.toLocaleString()}</strong>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          disabled={savingId === prod.id || prod.stock <= 0}
                          onClick={() =>
                            handleQuickUpdate(prod, {
                              stock: Math.max(0, prod.stock - 1),
                            })
                          }
                          title="Decrease stock by 1"
                        >
                          −
                        </button>
                        {prod.stock === 0 ? (
                          <span className="text-danger fw-bold text-center text-nowrap">
                            0 (Out)
                          </span>
                        ) : (
                          <span className="fw-semibold text-center text-nowrap">
                            {prod.stock} units
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          disabled={savingId === prod.id}
                          onClick={() =>
                            handleQuickUpdate(prod, { stock: prod.stock + 5 })
                          }
                          title="Add 5 units to stock"
                        >
                          +5
                        </button>
                      </div>
                    </td>
                    <td>{prod.salesCount} sold</td>
                    <td>
                      <span
                        className={`badge rounded-pill ${
                          prod.status === "active"
                            ? "bg-success-subtle text-success"
                            : prod.status === "out-of-stock"
                            ? "bg-danger-subtle text-danger"
                            : "bg-secondary-subtle text-secondary"
                        }`}
                      >
                        {prod.status === "active"
                          ? "Active"
                          : prod.status === "out-of-stock"
                          ? "Out of Stock"
                          : prod.status === "draft"
                          ? "Draft"
                          : "Archived"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => setEditingProduct({ ...prod })}
                          disabled={savingId === prod.id}
                        >
                          ✏️ Edit
                        </button>
                        {prod.status !== "archived" && (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleArchiveOrDelete(prod)}
                            disabled={savingId === prod.id}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center p-5 text-secondary">
                    No products found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product & Inventory Modal */}
      {editingProduct && (
        <div
          className="modal d-block bg-dark bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-title"
          tabIndex={-1}
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <form className="modal-content" onSubmit={handleModalSave}>
              <div className="modal-header">
                <h2 className="modal-title fs-5 fw-bold" id="edit-product-title">
                  Edit Product &amp; Inventory
                </h2>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setEditingProduct(null)}
                />
              </div>
              <div className="modal-body">
              <p className="small text-secondary mb-3">
                Changes are saved directly to your store catalog.
              </p>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="edit-p-name">Product Title</label>
                <input
                  id="edit-p-name"
                  className="form-control"
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label fw-semibold" htmlFor="edit-p-sku">SKU Code</label>
                  <input
                    id="edit-p-sku"
                    className="form-control"
                    type="text"
                    required
                    value={editingProduct.sku}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sku: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label fw-semibold" htmlFor="edit-p-status">Listing Status</label>
                  <select
                    id="edit-p-status"
                    className="form-select"
                    value={editingProduct.status}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        status: e.target.value as SellerProductItem["status"],
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label fw-semibold" htmlFor="edit-p-price">Selling Price (৳ BDT)</label>
                  <input
                    id="edit-p-price"
                    className="form-control"
                    type="number"
                    min={1}
                    required
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label fw-semibold" htmlFor="edit-p-stock">
                    Available Inventory Stock
                  </label>
                  <input
                    id="edit-p-stock"
                    className="form-control"
                    type="number"
                    min={0}
                    required
                    value={editingProduct.stock}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stock: Math.max(0, Math.floor(Number(e.target.value))),
                      })
                    }
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="edit-p-img">Primary Image URL</label>
                <input
                  id="edit-p-img"
                  className="form-control"
                  type="url"
                  value={editingProduct.image}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      image: e.target.value,
                    })
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="edit-p-desc">Product Description</label>
                <textarea
                  id="edit-p-desc"
                  className="form-control"
                  rows={3}
                  value={editingProduct.description || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingId === editingProduct.id}
                >
                  {savingId === editingProduct.id
                    ? "Saving to Database..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
