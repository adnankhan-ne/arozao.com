"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthAccessToken } from "@/lib/auth";

export default function SellerStorePage() {
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupDistrict, setPickupDistrict] = useState("");
  const [pickupDivision, setPickupDivision] = useState("");
  const [returnAddress, setReturnAddress] = useState("");
  const [vacationMode, setVacationMode] = useState(false);
  const [rating, setRating] = useState(5.0);
  const [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vacationSaving, setVacationSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadStoreProfile = useCallback(async () => {
    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/seller/store", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        if (data?.ok && data.store) {
          setStoreName(data.store.store_name || "");
          setStoreSlug(data.store.store_slug || "");
          setDesc(data.store.store_description || "");
          setVacationMode(Boolean(data.store.vacation_mode));
          setRating(Number(data.store.rating ?? 0));
          setIsVerified(Boolean(data.store.is_verified_merchant));
        }
        if (data?.businessProfile) {
          setPhone(data.businessProfile.owner_mobile || "");
          setPickupAddress(
            data.businessProfile.warehouse_pickup_address || ""
          );
          setPickupDistrict(data.businessProfile.warehouse_district || "");
          setPickupDivision(data.businessProfile.warehouse_division || "");
          setReturnAddress(data.businessProfile.customer_return_address || "");
        }
      } else {
        setErrorMsg(data?.error || "Failed to load store profile.");
      }
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to load store profile."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStoreProfile();
  }, [loadStoreProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaved(false);
    setSaving(true);

    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/seller/store", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          storeName: storeName.trim(),
          description: desc.trim(),
          contactPhone: phone.trim(),
          pickupAddress: pickupAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || "Failed to update store profile.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setErrorMsg("Network error saving store profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleVacationModeChange = async (enabled: boolean) => {
    setErrorMsg("");
    setSaved(false);
    setVacationSaving(true);
    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/seller/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ vacationMode: enabled }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || "Failed to update vacation mode.");
        return;
      }
      setVacationMode(Boolean(data.vacationMode));
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to update vacation mode."
      );
    } finally {
      setVacationSaving(false);
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <div>
          <span className="badge rounded-pill bg-primary-subtle text-primary mb-2">Storefront Branding</span>
          <h1 className="h3 fw-bold mb-2">My Arozao Marketplace Store</h1>
          <p className="text-secondary mb-0">
            Edit the profile details supported by your seller account. Store name
            and customer return address are managed through seller support.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="row g-3">
        {/* Left Form */}
        <div className="col-12 col-xl-7">
        <div className="card border-0 shadow-sm rounded-4"><div className="card-body p-3 p-md-4">
          {loading ? (
            <p className="text-secondary">Loading your store profile...</p>
          ) : (
            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="st-name-edit">Public Store Display Name</label>
                <input
                  id="st-name-edit"
                  className="form-control"
                  type="text"
                  required
                  value={storeName}
                  readOnly
                />
                <div className="form-text">Contact seller support to change your public store name.</div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Public URL</label>
                <div className="input-group" aria-label="Public store URL">
                  <span className="input-group-text">arozao.com/store/</span>
                  <span className="form-control bg-light">
                    {storeSlug || "merchant-store"}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="st-desc-edit">Store Biography</label>
                <textarea
                  id="st-desc-edit"
                  className="form-control"
                  rows={4}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="st-phone">Merchant Contact Phone</label>
                <input
                  id="st-phone"
                  className="form-control"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="st-pickup">Warehouse / Courier Pickup Address</label>
                <input
                  id="st-pickup"
                  className="form-control"
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold" htmlFor="st-district">Warehouse District</label>
                  <input id="st-district" className="form-control" value={pickupDistrict} readOnly />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold" htmlFor="st-division">Warehouse Division</label>
                  <input id="st-division" className="form-control" value={pickupDivision} readOnly />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="st-return">Customer Return Address</label>
                <input
                  id="st-return"
                  className="form-control"
                  type="text"
                  value={returnAddress}
                  readOnly
                />
                <div className="form-text">Return address changes are managed through seller support.</div>
              </div>

              <div className="mb-3">
                <label className="form-check">
                  <input
                    className="form-check-input me-2"
                    type="checkbox"
                    checked={vacationMode}
                    disabled={vacationSaving}
                    onChange={(e) => void handleVacationModeChange(e.target.checked)}
                  />
                  <span>
                    Enable Store Vacation Mode (Pause incoming orders
                    temporarily){vacationSaving ? " — Updating..." : ""}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : saved
                  ? "✓ Saved Successfully!"
                  : "Save Store Changes"}
              </button>
            </form>
          )}
        </div>
        </div></div>

        {/* Right Preview */}
        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h2 className="h5 fw-bold">Customer Storefront Preview</h2>
              <div className="card rounded-3 overflow-hidden mt-3">
                <div className="bg-primary text-white p-4">
                  <span className="fw-semibold">
                    🏪 Arozao Official Marketplace
                  </span>
                </div>
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary fw-bold fs-4 p-3">
                      {(storeName || "M").charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-grow-1">
                      <h3 className="h5 fw-bold mb-1">
                        {storeName || "Merchant Store"}
                      </h3>
                      <span className="badge rounded-pill bg-success-subtle text-success">
                        {isVerified ? "✓ Verified Arozao Merchant" : "Merchant Store"}
                      </span>
                    </div>
                  </div>
                  <p className="text-secondary mb-3">
                    {desc || "Verified Bangladesh marketplace merchant."}
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <span className="badge rounded-pill bg-light text-secondary">
                      {rating > 0
                        ? "Rating: " + rating.toFixed(1) + " / 5"
                        : "Rating not yet available"}
                    </span>
                    <span className="badge rounded-pill bg-light text-secondary">
                      Authentic Catalog
                    </span>
                    <span className="badge rounded-pill bg-light text-secondary">
                      Doorstep Pickup
                    </span>
                    {vacationMode && (
                      <span className="badge rounded-pill bg-warning-subtle text-warning">
                        Vacation Mode Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
