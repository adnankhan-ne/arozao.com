"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import {
  fetchCurrentProfile,
  getAuthAccessToken,
  getSessionUser,
  logoutUser,
  SessionUser,
} from "@/lib/auth";
import {
  AuthoritativeCheckoutQuote,
  createOrderOnServer,
  fetchAuthoritativeCheckoutQuote,
} from "@/lib/orders";
import { useNotifications } from "@/components/NotificationProvider";
import { normalizeBdPhone, isValidEmail } from "@/lib/validation";
import {
  Truck,
  Zap,
  Banknote,
  Lightbulb,
  Smartphone,
  ShieldCheck,
  CreditCard,
  Lock,
  AlertTriangle,
  Tag,
  Calendar,
  RotateCcw,
  MapPin,
} from "lucide-react";

const DIVISIONS = [
  "Dhaka",
  "Chittagong",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Rangpur",
  "Mymensingh",
];

const AREA_SUGGESTIONS: Record<string, string[]> = {
  Dhaka: ["Banani", "Gulshan", "Dhanmondi", "Uttara", "Mirpur", "Mohammadpur", "Motijheel", "Badda", "Bashundhara R/A"],
  Chittagong: ["Agrabad", "Nasirabad", "GEC Circle", "Halishahar", "Panchlaish", "Khulshi"],
  Sylhet: ["Zindabazar", "Amberkhana", "Upashahar", "Shahi Eidgah", "Subidbazar"],
  Rajshahi: ["Boalia", "Motihar", "Rajpara", "Kazla"],
  Khulna: ["Sonadanga", "Boyra", "Khalishpur", "Daulatpur"],
  Barisal: ["Sadar", "Natun Bazar", "Rupatali"],
  Rangpur: ["Dhap", "Jahaj Company More", "Modern More"],
  Mymensingh: ["Town Hall", "Ganginar Par", "Charpara"],
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const { notifyStatusChange } = useNotifications();

  const [sessionUser, setSessionUserState] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [area, setArea] = useState("Banani");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Input Refs for focusing first field with error on submit
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);
  const walletInputRef = useRef<HTMLInputElement>(null);

  // Field touched state for inline error display on blur
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const handleBlur = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  // Shipping Speed
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"Cash on delivery" | "bKash / Nagad / Rocket" | "Debit / Credit Card">("Cash on delivery");
  const [walletProvider, setWalletProvider] = useState<"bKash" | "Nagad" | "Rocket" | "Upay">("bKash");
  const [walletNumber, setWalletNumber] = useState("");

  // Coupon & Server Quote State (Authoritative DB validation)
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>("");
  const [couponError, setCouponError] = useState("");
  const [serverQuote, setServerQuote] = useState<AuthoritativeCheckoutQuote | null>(null);
  const [isValidatingQuote, setIsValidatingQuote] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  // Initialize and verify session user + saved addresses + initial coupon from URL
  useEffect(() => {
    let active = true;

    // Check URL parameters for coupon applied on Cart page
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCoupon = urlParams.get("coupon");
      if (urlCoupon) {
        setAppliedCouponCode(urlCoupon.trim().toUpperCase());
      }
    }

    const cached = getSessionUser();
    if (cached) {
      setSessionUserState(cached);
      if (cached.name) setName(cached.name);
      if (cached.email) setEmail(cached.email);
    }

    async function verifyUser() {
      const verified = await fetchCurrentProfile();
      if (!active) return;
      setSessionUserState(verified);
      if (verified?.name) setName((prev) => prev || verified.name);
      if (verified?.email) setEmail((prev) => prev || verified.email);

      if (verified) {
        try {
          const token = getAuthAccessToken();
          const res = await fetch("/api/auth/me", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: "include",
            cache: "no-store",
          });
          if (res.ok) {
            const meData = await res.json();
            if (active && Array.isArray(meData?.addresses) && meData.addresses.length > 0) {
              setSavedAddresses(meData.addresses);
              const defAddr =
                meData.addresses.find((a: { is_default_shipping?: boolean }) => a.is_default_shipping) ||
                meData.addresses[0];
              if (defAddr) {
                setSelectedAddressId(defAddr.id);
                if (defAddr.recipient_name) setName(defAddr.recipient_name);
                if (defAddr.recipient_phone) setPhone(defAddr.recipient_phone);
                if (defAddr.division) setCity(defAddr.division);
                if (defAddr.upazila_thana) setArea(defAddr.upazila_thana);
                if (defAddr.street_address) setAddress(defAddr.street_address);
              }
            }
          }
        } catch {
          // Ignore address prefetch errors
        }
      }

      setHydrated(true);
    }

    void verifyUser();
    return () => {
      active = false;
    };
  }, []);

  // Primitive key of cart items (identifiers + quantities only) for server quote synchronization
  const itemsSignature = useMemo(
    () => items.map((i) => `${i.id || ""}:${i.slug}:${i.quantity}`).join("|"),
    [items]
  );

  // Synchronize checkout pricing, stock availability, delivery fee, discount, and grand total with the backend.
  useEffect(() => {
    let active = true;
    if (!itemsSignature) {
      setServerQuote(null);
      return;
    }

    const requestItems = itemsSignature.split("|").map((part) => {
      const [id, slug, qty] = part.split(":");
      return {
        id: id || undefined,
        slug: slug || undefined,
        quantity: Number(qty) || 1,
      };
    });

    setIsValidatingQuote(true);
    fetchAuthoritativeCheckoutQuote({
      items: requestItems,
      shippingMethod,
      couponCode: appliedCouponCode || undefined,
    })
      .then((quote) => {
        if (!active) return;
        if (quote) {
          setServerQuote(quote);
          if (appliedCouponCode && quote.couponError) {
            setCouponError(quote.couponError);
            setAppliedCouponCode("");
          }
        }
      })
      .finally(() => {
        if (active) setIsValidatingQuote(false);
      });

    return () => {
      active = false;
    };
  }, [itemsSignature, shippingMethod, appliedCouponCode]);

  const handleSignOut = async () => {
    await logoutUser();
    setSessionUserState(null);
  };

  // Authoritative server-validated totals (never computed from client prices)
  const subtotal = serverQuote?.subtotal ?? 0;
  const baseDeliveryFee = serverQuote?.baseDeliveryFee ?? 60;
  const deliveryFee =
    serverQuote?.deliveryFee ?? (shippingMethod === "express" ? 120 : 60);
  const appliedCoupon = serverQuote?.appliedCoupon ?? null;
  const discount = serverQuote?.discountAmount ?? 0;
  const grandTotal = serverQuote?.grandTotal ?? 0;
  const estimatedDeliveryText = serverQuote?.estimatedDelivery ?? "Within 2–3 business days";
  const stockErrors = serverQuote?.stockErrors ?? [];

  // Authoritative server-side coupon validation (transmits only item IDs/slugs + quantities, never client totals)
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    setCouponError("");

    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setIsValidatingQuote(true);
    try {
      const token = getAuthAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers,
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          code,
          shippingMethod,
          items: items.map((i) => ({
            id: i.id,
            slug: i.slug,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.valid) {
        setCouponError(data?.error || "Invalid coupon code.");
        return;
      }

      setAppliedCouponCode(data.code || code);
      if (data.quote) {
        setServerQuote(data.quote);
      }
      setCouponCode("");
    } catch {
      setCouponError("Unable to validate coupon code right now. Please try again.");
    } finally {
      setIsValidatingQuote(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode("");
    setCouponError("");
  };

  // Validation rules for customer contact, delivery, and wallet
  const normalizedPhone = normalizeBdPhone(phone);
  const phoneError = !phone.trim()
    ? "Please enter your mobile phone number."
    : !normalizedPhone
    ? "Please enter a valid mobile number (e.g., 01712345678)."
    : "";

  const emailError =
    email.trim() && !isValidEmail(email)
      ? "Please enter a valid email address (e.g., name@example.com)."
      : "";

  const normalizedWallet = normalizeBdPhone(walletNumber);
  const walletNumberError =
    paymentMethod === "bKash / Nagad / Rocket"
      ? !walletNumber.trim()
        ? `Please enter your ${walletProvider} account number.`
        : !normalizedWallet
        ? "Please enter a valid mobile number (e.g., 01712345678)."
        : ""
      : "";

  const nameError = !name.trim() ? "Please enter your full name." : "";
  const addressError = !address.trim()
    ? "Please enter your full street delivery address."
    : "";

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!sessionUser) {
      setSubmitError("Please sign in to your account before placing an order.");
      return;
    }

    const hasErrors = Boolean(
      nameError || phoneError || emailError || addressError || walletNumberError
    );

    if (hasErrors) {
      setTouched({
        name: true,
        phone: true,
        email: true,
        address: true,
        walletNumber: true,
      });

      // Focus the first invalid field in natural reading order
      if (nameError) {
        nameInputRef.current?.focus();
      } else if (phoneError) {
        phoneInputRef.current?.focus();
      } else if (emailError) {
        emailInputRef.current?.focus();
      } else if (addressError) {
        addressInputRef.current?.focus();
      } else if (walletNumberError) {
        walletInputRef.current?.focus();
      }

      setSubmitError(
        phoneError ||
          walletNumberError ||
          nameError ||
          addressError ||
          emailError ||
          "Please correct the errors in the form before proceeding."
      );
      return;
    }

    if (stockErrors.length > 0) {
      setSubmitError(stockErrors[0]);
      return;
    }

    setIsSubmitting(true);

    const fullStreetAddress = area ? `${address.trim()}, ${area}` : address.trim();

    const { order: createdOrder, error: orderErr } = await createOrderOnServer({
      addressId: selectedAddressId || undefined,
      customerName: name.trim(),
      customerEmail: email.trim() || sessionUser.email,
      customerPhone: normalizedPhone || phone.trim(),
      division: city,
      area,
      streetAddress: fullStreetAddress,
      notes: notes.trim(),
      shippingMethod,
      paymentMethod: `${paymentMethod}${
        paymentMethod === "bKash / Nagad / Rocket" ? ` (${walletProvider})` : ""
      }`,
      walletProvider:
        paymentMethod === "bKash / Nagad / Rocket" ? walletProvider : undefined,
      walletNumber:
        paymentMethod === "bKash / Nagad / Rocket"
          ? normalizedWallet || walletNumber.trim()
          : undefined,
      couponCode: appliedCoupon?.code || appliedCouponCode || undefined,
      saveAddressForFuture,
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        quantity: item.quantity,
      })),
    });

    if (!createdOrder) {
      setIsSubmitting(false);
      setSubmitError(
        orderErr || "Unable to place order. Please verify stock and try again."
      );
      return;
    }

    // If payment method is Card, retrieve SSLCommerz gateway URL and redirect
    if (paymentMethod === "Debit / Credit Card") {
      try {
        const token = getAuthAccessToken();
        const payRes = await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            orderId: createdOrder.id,
            paymentMethod: "Card",
          }),
        });

        const payData = await payRes.json();
        if (payData?.ok && payData?.gatewayUrl) {
          notifyStatusChange(createdOrder, "Processing", "Processing");
          clear();
          window.location.href = payData.gatewayUrl;
          return;
        }
      } catch {
        // Fallback to order confirmation receipt if gateway URL fetch encountered error
      }
    }

    // 1. Trigger real-time status notification for the newly created server order
    notifyStatusChange(createdOrder, "Processing", "Processing");

    // 2. Clear customer cart only after authoritative server creation succeeds
    clear();

    // 3. Redirect to order confirmation receipt
    router.push(`/order-confirmation?orderId=${encodeURIComponent(createdOrder.id)}`);
  };

  if (!hydrated) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <p>Preparing secure checkout...</p>
        </div>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <h1>Your cart is currently empty</h1>
          <p>Please add products to your cart before proceeding to checkout.</p>
          <div className="empty-actions">
            <Link href="/products" className="button button-primary">
              Explore Products &amp; Deals
            </Link>
            <Link href="/wishlist" className="button button-secondary">
              View Saved Wishlist
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="site-content checkout-content">
      <div className="page-intro">
        <span className="eyebrow">Arozao Express Checkout</span>
        <h1>Complete Your Order</h1>
        <p>Fast, dependable doorstep delivery with cash on delivery or instant digital payments.</p>
      </div>

      <div className="checkout-layout">
        {/* Left Column: Checkout Form */}
        <div className="checkout-form-column">
          {/* Account Status Banner */}
          <div className="checkout-auth-banner">
            <div className="checkout-auth-status">
              <span className="auth-badge-icon">
                {sessionUser ? "✅" : "👤"}
              </span>
              <div className="auth-badge-text">
                {sessionUser ? (
                  <>
                    <strong>Logged in as {sessionUser.name}</strong>
                    <small>{sessionUser.email} • Your order will be linked to your account</small>
                  </>
                ) : (
                  <>
                    <strong>Account Sign-In Required</strong>
                    <small>Please sign in or create an account to place and track your order</small>
                  </>
                )}
              </div>
            </div>

            <div className="checkout-auth-actions">
              {sessionUser ? (
                <button type="button" className="auth-action-link" onClick={handleSignOut}>
                  Sign out
                </button>
              ) : (
                <Link href="/login?redirect=/checkout" className="auth-action-link">
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {submitError && (
            <div className="auth-error-banner" style={{ marginBottom: 16 }}>
              {submitError}
            </div>
          )}

          <form className="checkout-form" onSubmit={handleSubmitOrder}>
            {/* Step 1: Contact & Delivery Address */}
            <section className="form-section">
              <h2 className="section-title">
                <span className="section-step">1</span> Contact &amp; Delivery Address
              </h2>

              {savedAddresses.length > 0 && (
                <div className="form-group">
                  <label htmlFor="saved-address-select">Saved Delivery Addresses</label>
                  <select
                    id="saved-address-select"
                    value={selectedAddressId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedAddressId(id);
                      const chosen = savedAddresses.find((a) => a.id === id);
                      if (chosen) {
                        if (chosen.recipient_name) setName(chosen.recipient_name);
                        if (chosen.recipient_phone) setPhone(chosen.recipient_phone);
                        if (chosen.division) setCity(chosen.division);
                        if (chosen.upazila_thana) setArea(chosen.upazila_thana);
                        if (chosen.street_address) setAddress(chosen.street_address);
                      }
                    }}
                  >
                    {savedAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.address_title || "Saved Address"}: {addr.street_address}, {addr.division}
                      </option>
                    ))}
                    <option value="">+ Enter a new delivery address</option>
                  </select>
                </div>
              )}

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="name">
                    Full Name <span className="required-star">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    id="name"
                    type="text"
                    required
                    placeholder="e.g. Tanvir Ahmed"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur("name")}
                    aria-invalid={Boolean(touched.name && nameError)}
                    aria-describedby={touched.name && nameError ? "name-error" : undefined}
                  />
                  {touched.name && nameError && (
                    <p id="name-error" role="alert" className="form-field-error">
                      {nameError}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">
                    Mobile Phone Number <span className="required-star">*</span>
                  </label>
                  <input
                    ref={phoneInputRef}
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder="e.g. 01712-345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => handleBlur("phone")}
                    aria-invalid={Boolean(touched.phone && phoneError)}
                    aria-describedby={touched.phone && phoneError ? "phone-error" : undefined}
                  />
                  {touched.phone && phoneError && (
                    <p id="phone-error" role="alert" className="form-field-error">
                      {phoneError}
                    </p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  Email Address (for order tracking alerts &amp; receipt)
                </label>
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. tanvir@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur("email")}
                  aria-invalid={Boolean(touched.email && emailError)}
                  aria-describedby={touched.email && emailError ? "email-error" : undefined}
                />
                {touched.email && emailError && (
                  <p id="email-error" role="alert" className="form-field-error">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="city">
                    Division / District <span className="required-star">*</span>
                  </label>
                  <select
                    id="city"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      const suggestions = AREA_SUGGESTIONS[e.target.value];
                      if (suggestions && suggestions.length > 0) {
                        setArea(suggestions[0]);
                      }
                    }}
                  >
                    {DIVISIONS.map((d) => (
                      <option value={d} key={d}>
                        {d} Division
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="area">
                    Thana / Area <span className="required-star">*</span>
                  </label>
                  {AREA_SUGGESTIONS[city] ? (
                    <select id="area" value={area} onChange={(e) => setArea(e.target.value)}>
                      {AREA_SUGGESTIONS[city].map((ar) => (
                        <option value={ar} key={ar}>
                          {ar}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="area"
                      type="text"
                      placeholder="e.g. Area, Upazila"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">
                  Full Street Address &amp; House Details <span className="required-star">*</span>
                </label>
                <textarea
                  ref={addressInputRef}
                  id="address"
                  required
                  placeholder="House number, flat / floor, road number, block, nearby landmark..."
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => handleBlur("address")}
                  aria-invalid={Boolean(touched.address && addressError)}
                  aria-describedby={touched.address && addressError ? "address-error" : undefined}
                />
                {touched.address && addressError && (
                  <p id="address-error" role="alert" className="form-field-error">
                    {addressError}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="notes">Delivery Instructions (Optional)</label>
                <input
                  id="notes"
                  type="text"
                  placeholder="e.g. Call before delivery, deliver after 2 PM, leave with guard..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={saveAddressForFuture}
                  onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                />
                Save this delivery address to my profile for future orders
              </label>
            </section>

            {/* Step 2: Delivery Speed */}
            <section className="form-section">
              <h2 className="section-title">
                <span className="section-step">2</span> Delivery Speed &amp; Method
              </h2>

              <div className="shipping-options-grid">
                <label className={`shipping-card-option ${shippingMethod === "standard" ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="shippingSpeed"
                    value="standard"
                    checked={shippingMethod === "standard"}
                    onChange={() => setShippingMethod("standard")}
                  />
                  <div className="shipping-opt-content">
                    <div className="shipping-opt-header">
                      <span className="shipping-opt-title">
                        <Truck size={16} className="inline-block mr-1.5 text-slate-700" aria-hidden="true" />
                        Standard Delivery
                      </span>
                      <span className={`shipping-opt-price ${baseDeliveryFee === 0 ? "is-free" : ""}`}>
                        {baseDeliveryFee === 0 ? "FREE" : "৳60"}
                      </span>
                    </div>
                    <p className="shipping-opt-desc">
                      Delivered in 2–3 business days across {city}. Free on orders over ৳1,500.
                    </p>
                  </div>
                </label>

                <label className={`shipping-card-option ${shippingMethod === "express" ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="shippingSpeed"
                    value="express"
                    checked={shippingMethod === "express"}
                    onChange={() => setShippingMethod("express")}
                  />
                  <div className="shipping-opt-content">
                    <div className="shipping-opt-header">
                      <span className="shipping-opt-title">
                        <Zap size={16} className="inline-block mr-1.5 text-amber-500" aria-hidden="true" />
                        Express Delivery
                      </span>
                      <span className="shipping-opt-price">৳120</span>
                    </div>
                    <p className="shipping-opt-desc">
                      Priority dispatch within 24 hours. Estimated arrival by tomorrow evening.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* Step 3: Payment Method */}
            <section className="form-section">
              <h2 className="section-title">
                <span className="section-step">3</span> Payment Method
              </h2>

              <div className="payment-options-grid">
                {/* Cash on Delivery */}
                <label className={`payment-card-option ${paymentMethod === "Cash on delivery" ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash on delivery"
                    checked={paymentMethod === "Cash on delivery"}
                    onChange={() => setPaymentMethod("Cash on delivery")}
                  />
                  <div className="payment-opt-content">
                    <div className="payment-opt-title">
                      <span className="opt-icon">
                        <Banknote size={16} className="inline-block mr-1 text-emerald-600" aria-hidden="true" />
                      </span>{" "}
                      Cash on Delivery (COD)
                    </div>
                    <small className="payment-opt-desc">
                      Pay cash to the courier rider upon inspecting and receiving your package at your doorstep
                    </small>
                  </div>
                </label>

                {paymentMethod === "Cash on delivery" && (
                  <div className="payment-subform">
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Lightbulb size={15} className="text-amber-500" aria-hidden="true" /> Friendly Tip:
                    </span>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>
                      Please keep exact cash of <strong>৳{grandTotal.toLocaleString()}</strong> ready to help your courier rider complete delivery quickly.
                    </p>
                  </div>
                )}

                {/* Mobile Banking */}
                <label className={`payment-card-option ${paymentMethod === "bKash / Nagad / Rocket" ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bKash / Nagad / Rocket"
                    checked={paymentMethod === "bKash / Nagad / Rocket"}
                    onChange={() => setPaymentMethod("bKash / Nagad / Rocket")}
                  />
                  <div className="payment-opt-content">
                    <div className="payment-opt-title">
                      <span className="opt-icon">
                        <Smartphone size={16} className="inline-block mr-1 text-blue-600" aria-hidden="true" />
                      </span>{" "}
                      Mobile Banking (bKash / Nagad / Rocket / Upay)
                    </div>
                    <small className="payment-opt-desc">
                      Pay instantly with 0% extra fee from your favorite Bangladesh digital wallet
                    </small>
                  </div>
                </label>

                {paymentMethod === "bKash / Nagad / Rocket" && (
                  <div className="payment-subform">
                    <div className="wallet-provider-selector">
                      {(["bKash", "Nagad", "Rocket", "Upay"] as const).map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          className={`wallet-provider-btn ${walletProvider === prov ? `is-active provider-${prov.toLowerCase()}` : ""}`}
                          onClick={() => setWalletProvider(prov)}
                        >
                          {prov}
                        </button>
                      ))}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="walletNumber" style={{ fontSize: 12 }}>
                        {walletProvider} Account Number:
                      </label>
                      <input
                        ref={walletInputRef}
                        id="walletNumber"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="01XXXXXXXXX"
                        value={walletNumber}
                        onChange={(e) => setWalletNumber(e.target.value)}
                        onBlur={() => handleBlur("walletNumber")}
                        aria-invalid={Boolean(touched.walletNumber && walletNumberError)}
                        aria-describedby={touched.walletNumber && walletNumberError ? "wallet-error" : undefined}
                        className={touched.walletNumber && walletNumberError ? "input-field-error" : ""}
                        style={{ maxWidth: 320 }}
                      />
                      {touched.walletNumber && walletNumberError && (
                        <p id="wallet-error" role="alert" className="form-field-error">
                          {walletNumberError}
                        </p>
                      )}
                      <small className="payment-subform-hint" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <ShieldCheck size={14} className="text-slate-500" aria-hidden="true" />
                        Safe &amp; verified. Enter your {walletProvider} wallet number for record &amp; verification.
                      </small>
                    </div>
                  </div>
                )}

                {/* Card Payment */}
                <label className={`payment-card-option ${paymentMethod === "Debit / Credit Card" ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Debit / Credit Card"
                    checked={paymentMethod === "Debit / Credit Card"}
                    onChange={() => setPaymentMethod("Debit / Credit Card")}
                  />
                  <div className="payment-opt-content">
                    <div className="payment-opt-title">
                      <span className="opt-icon">
                        <CreditCard size={16} className="inline-block mr-1 text-indigo-600" aria-hidden="true" />
                      </span>{" "}
                      Debit / Credit Card (Visa, Mastercard, Amex)
                    </div>
                    <small className="payment-opt-desc">
                      All local &amp; international cards supported via secure 256-bit encrypted gateway
                    </small>
                  </div>
                </label>

                {paymentMethod === "Debit / Credit Card" && (
                  <div className="payment-subform">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, marginBottom: 12 }}>
                      <Lock size={20} className="text-sky-600 flex-shrink-0" aria-hidden="true" style={{ marginTop: 2 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: "#0369a1", fontWeight: 600, lineHeight: 1.4 }}>
                          You will be redirected to a secure payment page to complete your payment.
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#0284c7", lineHeight: 1.4 }}>
                          No card details are stored or processed on our servers. Your transaction is securely authenticated by your bank.
                        </p>
                      </div>
                    </div>

                    <div className="card-security-badge" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ShieldCheck size={16} className="text-emerald-600" aria-hidden="true" />
                      <span>256-Bit SSL Bank-Grade Encryption · Powered by SSLCommerz</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <button
              type="submit"
              className="button button-primary button-place-order"
              disabled={isSubmitting || isValidatingQuote || stockErrors.length > 0}
            >
              {isSubmitting
                ? "Placing your order..."
                : isValidatingQuote && !serverQuote
                ? "Verifying stock & prices..."
                : `Place Order · ৳${grandTotal.toLocaleString()}`}
            </button>
          </form>
        </div>

        {/* Right Column: Order Review & Breakdown Sidebar */}
        <aside className="checkout-summary-column">
          <div className="content-card checkout-summary-card">
            <h2>Order Review ({items.length} {items.length === 1 ? "Item" : "Items"})</h2>

            {stockErrors.length > 0 && (
              <div className="auth-error-banner" style={{ marginBottom: 12, fontSize: 12 }}>
                {stockErrors.map((err, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" aria-hidden="true" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="checkout-items-mini-list">
              {(serverQuote?.items ?? []).map((quoteItem) => (
                <div className="mini-item-row" key={quoteItem.slug}>
                  <Image
                    src={quoteItem.thumbnailUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80"}
                    alt={quoteItem.name}
                    width={48}
                    height={48}
                    sizes="48px"
                    referrerPolicy="no-referrer"
                    className="mini-item-img"
                    style={{ objectFit: "cover", borderRadius: 4 }}
                  />
                  <div className="mini-item-meta">
                    <span className="mini-item-name">{quoteItem.name}</span>
                    <small className="mini-item-qty">
                      Qty: {quoteItem.quantity} · ৳{quoteItem.unitPrice.toLocaleString()} each
                      {!quoteItem.isAvailable && (
                        <span style={{ color: "#ef4444", display: "block" }}>
                          ({quoteItem.stockError || "Out of stock"})
                        </span>
                      )}
                    </small>
                  </div>
                  <span className="mini-item-price">
                    ৳{quoteItem.lineTotal.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Promo / Coupon Box */}
            <div className="coupon-box">
              <div className="coupon-box-header" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Tag size={16} className="text-slate-600" aria-hidden="true" />
                <span>Have a promo voucher?</span>
              </div>

              {appliedCoupon ? (
                <div className="coupon-applied-pill">
                  <div>
                    <strong>{appliedCoupon.code}</strong>: {appliedCoupon.label} (-৳{appliedCoupon.discountAmount.toLocaleString()})
                  </div>
                  <button
                    type="button"
                    className="coupon-remove-btn"
                    onClick={handleRemoveCoupon}
                    title="Remove voucher"
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="coupon-input-group">
                    <input
                      type="text"
                      className="coupon-input"
                      placeholder="ENTER CODE"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <button
                      type="button"
                      className="coupon-apply-btn"
                      onClick={() => handleApplyCoupon()}
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <span className="coupon-error-msg">{couponError}</span>}
                  <div className="coupon-suggestions">
                    <small>Try:</small>
                    <button type="button" className="coupon-chip-btn" onClick={() => handleApplyCoupon("AROZAO10")}>
                      AROZAO10 (10% off)
                    </button>
                    <button type="button" className="coupon-chip-btn" onClick={() => handleApplyCoupon("EID2026")}>
                      EID2026 (৳200)
                    </button>
                  </div>
                </>
              )}
            </div>

            <hr className="summary-divider" />

            <div className="summary-line">
              <span>
                Subtotal (
                {(serverQuote?.items ?? []).reduce((s, i) => s + i.quantity, 0)} items)
              </span>
              <strong>৳{subtotal.toLocaleString()}</strong>
            </div>

            {discount > 0 && (
              <div className="summary-line" style={{ color: "#10b981" }}>
                <span>Coupon Discount ({appliedCoupon?.code})</span>
                <strong>-৳{discount.toLocaleString()}</strong>
              </div>
            )}

            <div className="summary-line">
              <span>Delivery Fee ({shippingMethod === "express" ? "Express Next-Day" : "Standard"})</span>
              <strong>{deliveryFee === 0 ? "FREE" : `৳${deliveryFee}`}</strong>
            </div>

            <hr className="summary-divider" />

            <div className="summary-line total-line">
              <span>Total to Pay</span>
              <strong className="grand-total">৳{grandTotal.toLocaleString()}</strong>
            </div>

            {/* Estimated Delivery Banner */}
            <div style={{ background: "rgba(241, 132, 14, 0.08)", padding: "10px 14px", borderRadius: 8, marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <Calendar size={20} className="text-amber-600 flex-shrink-0" aria-hidden="true" />
              <div style={{ fontSize: 12, lineHeight: 1.35 }}>
                <span style={{ color: "var(--color-text-secondary)", display: "block" }}>Estimated Delivery:</span>
                <strong style={{ color: "var(--color-primary)" }}>{estimatedDeliveryText}</strong>
              </div>
            </div>

            {/* Buyer Trust Guarantees */}
            <div className="checkout-trust-badges">
              <div className="trust-badge-item">
                <span className="trust-badge-icon">
                  <ShieldCheck size={18} className="text-emerald-600" aria-hidden="true" />
                </span>
                <span>Arozao Buyer Protection Guarantee</span>
              </div>
              <div className="trust-badge-item">
                <span className="trust-badge-icon">
                  <RotateCcw size={18} className="text-blue-600" aria-hidden="true" />
                </span>
                <span>7-Day Hassle-Free Returns &amp; Exchange</span>
              </div>
              <div className="trust-badge-item">
                <span className="trust-badge-icon">
                  <MapPin size={18} className="text-red-500" aria-hidden="true" />
                </span>
                <span>Real-Time GPS Tracking &amp; Live SMS Updates</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
