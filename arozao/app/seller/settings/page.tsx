"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthAccessToken } from "@/lib/auth";

export default function SellerSettingsPage() {
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [sellerCode, setSellerCode] = useState("Seller ID unavailable");
  const [ownerName, setOwnerName] = useState("");
  const [maskedNid, setMaskedNid] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/seller/store", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || "Failed to load seller settings.");
        return;
      }
      if (data?.ok) {
        if (data.store?.seller_code) {
          setSellerCode(data.store.seller_code);
        }
        if (data.businessProfile) {
          setOwnerName(
            data.businessProfile.owner_legal_name ||
              data.store?.store_name ||
              "Verified Merchant"
          );
          const rawNid = String(data.businessProfile.owner_nid_number || "");
          setMaskedNid(
            rawNid.length >= 4 ? `•••• ${rawNid.slice(-4)}` : "Verified"
          );
          setContactPhone(data.businessProfile.owner_mobile || "");
          setContactEmail(data.businessProfile.owner_email || "");
          setBusinessAddress(data.businessProfile.business_address || "");
        } else if (data.store) {
          setOwnerName(data.store.store_name || "Verified Merchant");
          setMaskedNid("Verified");
        }
      }
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to load seller settings."
      );
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

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
          contactPhone: contactPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || "Failed to save merchant settings.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Network error saving settings."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <div>
          <span className="badge rounded-pill bg-primary-subtle text-primary mb-2">Account &amp; Preferences</span>
          <h1 className="h3 fw-bold mb-2">Seller Center Settings</h1>
          <p className="text-secondary mb-0">
            Review account information and save your supported merchant contact
            phone. Notification preferences are not yet stored by the backend.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
        <form onSubmit={handleSave}>
          <h2 className="h5 fw-bold">Order Notification Preferences</h2>
          <p className="small text-secondary mb-3">
            Choose how you would like to be alerted when a customer places an
            order or when an Arozao courier rider is en route to your shop.
          </p>
          <div className="alert alert-info py-2 small" role="note">
            These notification switches are page-only and reset when you leave; backend preferences are not available yet.
          </div>

          <div className="vstack gap-2 mb-4">
            <label className="form-check">
              <input
                className="form-check-input me-2"
                type="checkbox"
                checked={notifySms}
                onChange={(e) => setNotifySms(e.target.checked)}
              />
              <span>
                Instant SMS alert on every new order (
                {contactPhone || "Registered Mobile"})
              </span>
            </label>
            <label className="form-check">
              <input
                className="form-check-input me-2"
                type="checkbox"
                checked={notifyWhatsapp}
                onChange={(e) => setNotifyWhatsapp(e.target.checked)}
              />
              <span>
                WhatsApp message with order dispatch details and shipping label
              </span>
            </label>
            <label className="form-check">
              <input
                className="form-check-input me-2"
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
              />
              <span>
                Email daily sales summary &amp; weekly settlement invoice (
                {contactEmail || "Registered Email"})
              </span>
            </label>
          </div>

          <hr className="my-4" />

          <h2 className="h5 fw-bold">Security &amp; Authorized Representative</h2>
          <div className="row g-3 mt-1">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Merchant ID</label>
              <input className="form-control" type="text" value={sellerCode} disabled />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Registered Legal Person</label>
              <input
                className="form-control"
                type="text"
                value={
                  ownerName
                    ? `${ownerName} (NID: ${maskedNid})`
                    : "Verified Merchant"
                }
                disabled
              />
            </div>
          </div>

          <div className="row g-3 mt-0">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold" htmlFor="set-phone">Authorized Contact Mobile</label>
              <input
                id="set-phone"
                className="form-control"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold" htmlFor="set-email">Authorized Contact Email</label>
              <input
                id="set-email"
                className="form-control"
                type="email"
                value={contactEmail}
                readOnly
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="set-biz-addr">Registered Business Address</label>
            <input
              id="set-biz-addr"
              className="form-control"
              type="text"
              value={businessAddress}
              readOnly
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving
              ? "Saving Settings..."
              : saved
              ? "✓ Contact Saved"
              : "Save Contact Phone"}
          </button>
        </form>
        </div>
      </div>

      {/* Support Info Box */}
      <div id="support" className="card border-0 shadow-sm rounded-4 mt-4">
        <div className="card-body">
        <h2 className="h5 fw-bold">Merchant Helpline &amp; Partner Desk</h2>
        <p className="text-secondary">
          Our merchant support center in Dhaka is available Saturday through
          Thursday, 9 AM – 8 PM.
        </p>
        <div className="d-flex flex-wrap gap-3 mt-3">
          <div>
            <strong>Hotline:</strong> +880 9612-276926
          </div>
          <div>
            <strong>WhatsApp:</strong> +880 1700-AROZAO
          </div>
          <div>
            <strong>Email:</strong> seller@arozao.com
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
