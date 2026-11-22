"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useWishlist } from "@/components/WishlistProvider";
import { useToast } from "@/components/ToastNotification";
import {
  fetchCurrentProfile,
  getAuthAccessToken,
  getSessionUser,
  logoutUser,
  SessionUser,
  updateUserProfile,
} from "@/lib/auth";
import { fetchCustomerOrdersFromApi } from "@/lib/orders";
import { Order } from "@/types";

const BD_DIVISIONS = [
  "Dhaka",
  "Chittagong",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Rangpur",
  "Mymensingh",
];

interface SavedAddressRecord {
  id: string;
  address_title: string;
  recipient_name: string;
  recipient_phone: string;
  division: string;
  district: string;
  upazila_thana: string;
  area_neighborhood?: string | null;
  street_address: string;
  postal_code?: string | null;
  is_default_shipping: boolean;
}

export default function AccountPage() {
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { showToast } = useToast();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Saved Addresses State
  const [addresses, setAddresses] = useState<SavedAddressRecord[]>([]);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [addressTitle, setAddressTitle] = useState("Home");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [division, setDivision] = useState("Dhaka");
  const [upazilaThana, setUpazilaThana] = useState("Banani");
  const [streetAddress, setStreetAddress] = useState("");
  const [isDefaultShipping, setIsDefaultShipping] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  useEffect(() => {
    let active = true;

    async function verifyAndLoad() {
      const cached = getSessionUser();
      if (cached) {
        setUser(cached);
        setFullName(cached.name);
        setRecipientName(cached.name);
      }

      const verified = await fetchCurrentProfile();
      if (!active) return;

      setUser(verified);

      if (verified) {
        setFullName(verified.name);
        setRecipientName(verified.name);

        const token = getAuthAccessToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const [meRes, dbOrders] = await Promise.all([
          fetch("/api/auth/me", {
            headers,
            credentials: "include",
            cache: "no-store",
          }).catch(() => null),
          fetchCustomerOrdersFromApi(),
        ]);

        if (!active) return;
        setOrders(dbOrders);

        if (meRes && meRes.ok) {
          try {
            const meData = await meRes.json();
            if (active && meData?.ok) {
              const prof = meData.profile || {};
              const usr = meData.user || {};
              setFullName(prof.full_name || usr.name || verified.name);
              setPhone(usr.phone || "");
              setGender(prof.gender || "");
              setDateOfBirth(
                prof.date_of_birth
                  ? String(prof.date_of_birth).slice(0, 10)
                  : ""
              );
              setPreferredLanguage(prof.preferred_language || "en");
              setNewsletterSubscribed(
                typeof prof.newsletter_subscribed === "boolean"
                  ? prof.newsletter_subscribed
                  : true
              );
              setRecipientName(prof.full_name || usr.name || verified.name);
              if (usr.phone) setRecipientPhone(usr.phone);

              if (Array.isArray(meData.addresses)) {
                setAddresses(meData.addresses);
              }
            }
          } catch {
            // Ignore parse error
          }
        }
      }

      setHydrated(true);
    }

    void verifyAndLoad();
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    await logoutUser();
    setUser(null);
    router.push("/login");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    if (!fullName.trim()) {
      setProfileMessage({
        type: "error",
        text: "Full name is required.",
      });
      return;
    }

    setIsSavingProfile(true);
    const result = await updateUserProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      gender: gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
      preferredLanguage,
      newsletterSubscribed,
    });
    setIsSavingProfile(false);

    if (!result.ok) {
      setProfileMessage({
        type: "error",
        text: result.error || "Failed to update account profile.",
      });
      return;
    }

    if (result.user) {
      setUser({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      });
    }

    setProfileMessage({
      type: "success",
      text: "Your account profile and preferences have been updated.",
    });
    showToast("Account profile updated!", { type: "success" });
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError("");

    if (!recipientName.trim() || !recipientPhone.trim() || !streetAddress.trim()) {
      setAddressError("Recipient name, phone number, and street address are required.");
      return;
    }

    setIsSavingAddress(true);
    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          addressTitle,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          division,
          district: division,
          upazilaThana: upazilaThana.trim() || "Sadar",
          streetAddress: streetAddress.trim(),
          isDefaultShipping,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.address) {
        setAddressError(data?.error || "Failed to save delivery address.");
        return;
      }

      const newAddr: SavedAddressRecord = data.address;
      setAddresses((prev) => {
        const updated = newAddr.is_default_shipping
          ? prev.map((a) => ({ ...a, is_default_shipping: false }))
          : prev;
        return [newAddr, ...updated];
      });
      setStreetAddress("");
      setShowAddAddressForm(false);
      showToast("Delivery address saved!", { type: "success" });
    } catch {
      setAddressError("Network error while saving address.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const token = getAuthAccessToken();
      const res = await fetch(`/api/addresses/${encodeURIComponent(addressId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ isDefaultShipping: true }),
      });

      const data = await res.json();
      if (res.ok && data?.ok) {
        setAddresses((prev) =>
          prev.map((a) => ({
            ...a,
            is_default_shipping: a.id === addressId,
          }))
        );
        showToast("Default shipping address updated", { type: "success" });
      }
    } catch {
      // Ignore error
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const token = getAuthAccessToken();
      const res = await fetch(`/api/addresses/${encodeURIComponent(addressId)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== addressId));
        showToast("Address removed", { type: "info" });
      }
    } catch {
      // Ignore error
    }
  };

  const latestOrder = orders.length > 0 ? orders[0] : null;

  if (!hydrated) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <p>Loading your account...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="site-content">
        <div
          className="empty-state"
          style={{ maxWidth: 540, margin: "0 auto", padding: "40px 24px" }}
        >
          <div className="empty-icon">🔐</div>
          <h1>Sign in to access your account</h1>
          <p>
            Track orders, manage saved items, and review your purchase history
            from one place.
          </p>
          <div
            className="empty-actions"
            style={{ flexDirection: "column", gap: 12, marginTop: 20 }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
                justifyContent: "center",
              }}
            >
              <Link
                href="/login"
                className="button button-primary"
                style={{ flex: 1, textAlign: "center" }}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="button button-secondary"
                style={{ flex: 1, textAlign: "center" }}
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="site-content account-page-content">
      <div className="page-intro">
        <span className="eyebrow">Customer Account · {user.role.toUpperCase()}</span>
        <h1>Welcome back, {user.name}</h1>
        <p>
          Manage your orders, profile details, saved delivery addresses, and
          customer preferences in one place.
        </p>
        <div
          className="empty-actions"
          style={{ justifyContent: "flex-start", marginTop: 12, gap: 10, flexWrap: "wrap" }}
        >
          {(user.role === "seller" ||
            user.role === "admin" ||
            user.role === "super_admin") && (
            <Link href="/seller" className="button button-primary">
              Open Seller Center
            </Link>
          )}
          <button
            type="button"
            className="button button-secondary"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="account-dashboard">
        {/* Metric Cards Row */}
        <div className="account-metrics-grid">
          <Link href="/orders" className="metric-card">
            <span className="metric-icon">📦</span>
            <div className="metric-info">
              <span className="metric-value">{orders.length}</span>
              <span className="metric-label">Past &amp; Active Orders</span>
            </div>
            <span className="metric-arrow">→</span>
          </Link>

          <Link href="/wishlist" className="metric-card">
            <span className="metric-icon">❤️</span>
            <div className="metric-info">
              <span className="metric-value">{wishlistCount}</span>
              <span className="metric-label">Saved in Wishlist</span>
            </div>
            <span className="metric-arrow">→</span>
          </Link>

          <Link href="/cart" className="metric-card">
            <span className="metric-icon">🛒</span>
            <div className="metric-info">
              <span className="metric-value">{cartCount}</span>
              <span className="metric-label">Items in Shopping Cart</span>
            </div>
            <span className="metric-arrow">→</span>
          </Link>
        </div>

        {/* Latest Order Alert if present */}
        {latestOrder && (
          <div className="content-card latest-order-banner">
            <div className="latest-order-header">
              <div>
                <span className="eyebrow">Recent Activity</span>
                <h3>Latest Order #{latestOrder.id}</h3>
              </div>
              <span
                className={`status-pill status-${latestOrder.status.toLowerCase()}`}
              >
                ● {latestOrder.status}
              </span>
            </div>
            <p>
              Estimated Delivery:{" "}
              <strong>{latestOrder.estimatedDelivery}</strong> for{" "}
              <strong>{latestOrder.items.length} items</strong> (৳
              {latestOrder.total.toLocaleString()}).
            </p>
            <div className="latest-order-actions">
              <Link
                href={`/order-confirmation?orderId=${latestOrder.id}`}
                className="button button-primary"
              >
                View Receipt &amp; Tracking
              </Link>
              <Link href="/orders" className="button button-secondary">
                All Orders ({orders.length})
              </Link>
            </div>
          </div>
        )}

        {/* Profile & Preferences Update Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <section className="content-card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <span className="eyebrow">Personal Details</span>
              <h2 style={{ margin: "4px 0 6px", fontSize: 20 }}>
                Profile &amp; Account Settings
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>
                Update your name, mobile number, and communication preferences.
              </p>
            </div>

            {profileMessage && (
              <div
                className={
                  profileMessage.type === "error"
                    ? "auth-error-banner"
                    : "status-pill status-delivered"
                }
                style={{
                  display: "block",
                  padding: "10px 14px",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="checkout-form">
              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="acc-full-name">Full Name *</label>
                  <input
                    id="acc-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="acc-email">Email Address (Verified)</label>
                  <input
                    id="acc-email"
                    type="email"
                    value={user.email}
                    disabled
                    style={{ opacity: 0.7, cursor: "not-allowed" }}
                  />
                </div>
              </div>

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="acc-phone">Mobile Phone Number</label>
                  <input
                    id="acc-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 01712-345678"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="acc-dob">Date of Birth</label>
                  <input
                    id="acc-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="acc-gender">Gender</label>
                  <select
                    id="acc-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="acc-lang">Preferred Language</label>
                  <select
                    id="acc-lang"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="bn">বাংলা (Bangla)</option>
                  </select>
                </div>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  marginBottom: 16,
                }}
              >
                <input
                  type="checkbox"
                  checked={newsletterSubscribed}
                  onChange={(e) => setNewsletterSubscribed(e.target.checked)}
                />
                Subscribe to exclusive Arozao Flash Sale &amp; voucher alerts
              </label>

              <button
                type="submit"
                className="button button-primary"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving Changes..." : "Save Profile Changes"}
              </button>
            </form>
          </section>

          {/* Saved Delivery Addresses Card */}
          <section className="content-card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <span className="eyebrow">Address Book</span>
                <h2 style={{ margin: "4px 0 6px", fontSize: 20 }}>
                  Saved Delivery Addresses ({addresses.length})
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Manage doorstep delivery locations across Bangladesh.
                </p>
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setShowAddAddressForm((prev) => !prev)}
                style={{ whiteSpace: "nowrap" }}
              >
                {showAddAddressForm ? "Cancel" : "+ Add Address"}
              </button>
            </div>

            {showAddAddressForm && (
              <form
                onSubmit={handleCreateAddress}
                className="checkout-form"
                style={{
                  marginBottom: 18,
                  padding: 16,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {addressError && (
                  <div className="auth-error-banner" style={{ marginBottom: 12 }}>
                    {addressError}
                  </div>
                )}

                <div className="form-row form-row-two">
                  <div className="form-group">
                    <label htmlFor="addr-title">Address Label</label>
                    <select
                      id="addr-title"
                      value={addressTitle}
                      onChange={(e) => setAddressTitle(e.target.value)}
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Family">Family</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="addr-recipient">Recipient Name *</label>
                    <input
                      id="addr-recipient"
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row form-row-two">
                  <div className="form-group">
                    <label htmlFor="addr-phone">Mobile Phone *</label>
                    <input
                      id="addr-phone"
                      type="tel"
                      required
                      placeholder="017XXXXXXXX"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="addr-div">Division *</label>
                    <select
                      id="addr-div"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                    >
                      {BD_DIVISIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="addr-thana">Thana / Area *</label>
                  <input
                    id="addr-thana"
                    type="text"
                    required
                    placeholder="e.g. Banani, Dhanmondi, Agrabad"
                    value={upazilaThana}
                    onChange={(e) => setUpazilaThana(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="addr-street">Full Street Address *</label>
                  <input
                    id="addr-street"
                    type="text"
                    required
                    placeholder="House, Road, Block, Flat..."
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                  />
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    cursor: "pointer",
                    marginBottom: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isDefaultShipping}
                    onChange={(e) => setIsDefaultShipping(e.target.checked)}
                  />
                  Set as default shipping address
                </label>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSavingAddress}
                >
                  {isSavingAddress ? "Saving..." : "Save Address"}
                </button>
              </form>
            )}

            {addresses.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                }}
              >
                No saved delivery addresses yet. Add one above for faster
                1-click checkout.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 10,
                      border: addr.is_default_shipping
                        ? "1px solid var(--color-primary)"
                        : "1px solid rgba(255,255,255,0.1)",
                      background: addr.is_default_shipping
                        ? "rgba(241, 132, 14, 0.06)"
                        : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <strong style={{ fontSize: 14 }}>
                        {addr.address_title || "Home"} · {addr.recipient_name}
                      </strong>
                      {addr.is_default_shipping && (
                        <span
                          className="status-pill status-delivered"
                          style={{ fontSize: 11, padding: "2px 8px" }}
                        >
                          Default Shipping
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {addr.street_address}, {addr.upazila_thana}, {addr.division}
                    </p>
                    <small style={{ color: "var(--color-text-secondary)" }}>
                      📞 {addr.recipient_phone}
                    </small>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        marginTop: 10,
                        fontSize: 12,
                      }}
                    >
                      {!addr.is_default_shipping && (
                        <button
                          type="button"
                          className="auth-action-link"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        type="button"
                        className="auth-action-link"
                        style={{ color: "#ef4444" }}
                        onClick={() => handleDeleteAddress(addr.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Action Hub */}
        <div className="account-hub-grid">
          <div className="content-card hub-card">
            <div className="hub-card-icon">🛍️</div>
            <h3>Your Orders</h3>
            <p>
              Track packages, print invoices, request exchanges, or re-order
              essentials.
            </p>
            <Link href="/orders" className="button button-primary">
              View All Orders
            </Link>
          </div>

          <div className="content-card hub-card">
            <div className="hub-card-icon">💖</div>
            <h3>Your Wishlist</h3>
            <p>
              See items you saved while browsing and quickly transfer them to
              your cart.
            </p>
            <Link href="/wishlist" className="button button-primary">
              Manage Wishlist
            </Link>
          </div>

          <div className="content-card hub-card">
            <div className="hub-card-icon">🛡️</div>
            <h3>Customer Support</h3>
            <p>
              Have questions about delivery times, returns, or payment options?
              We are here to help.
            </p>
            <Link href="/help" className="button button-secondary">
              Help Center &amp; FAQ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
