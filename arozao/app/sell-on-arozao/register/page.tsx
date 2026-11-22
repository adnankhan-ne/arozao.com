"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  SellerRegistrationFormData,
  SellerApplication,
  SellerType,
  PaymentMethodType,
  MfsProvider,
  SellerDocumentItem,
} from "@/types/seller";
import {
  getDraftRegistration,
  saveDraftRegistration,
  clearDraftRegistration,
  submitSellerRegistrationOnServer,
} from "@/lib/seller";

const BANGLADESH_DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Sylhet",
  "Barishal",
  "Rangpur",
  "Mymensingh",
];

const SELLER_CATEGORIES = [
  "electronics",
  "gadgets",
  "home-decor",
  "kitchen-appliances",
  "fashion",
  "lifestyle",
  "beauty-personal-care",
  "groceries",
];

const STEPS = [
  { id: 1, title: "Account & Store Setup" },
  { id: 2, title: "Business & Identity Details" },
  { id: 3, title: "Bank / Payout Information" },
  { id: 4, title: "Document Upload & Declaration" },
];

export default function SellerRegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SellerRegistrationFormData>(() =>
    getDraftRegistration()
  );
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftSavedAlert, setDraftSavedAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<SellerApplication | null>(
    null
  );

  useEffect(() => {
    setForm(getDraftRegistration());
  }, []);

  const syncForm = (updater: (prev: SellerRegistrationFormData) => SellerRegistrationFormData) => {
    setForm((prev) => {
      const next = updater(prev);
      saveDraftRegistration(next);
      return next;
    });
  };

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSaveDraftManual = () => {
    saveDraftRegistration(form);
    setDraftSavedAlert(true);
    setTimeout(() => setDraftSavedAlert(false), 2500);
  };

  const validateStep = (targetStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (targetStep === 1) {
      if (!form.account.fullName.trim())
        newErrors.fullName = "Full name is required.";
      if (
        !form.account.mobile.trim() ||
        form.account.mobile.trim().length < 10
      )
        newErrors.mobile = "Valid Bangladesh mobile number is required.";
      if (!form.account.email.trim() || !form.account.email.includes("@"))
        newErrors.email = "Valid email address is required.";
      if (!form.account.password || form.account.password.length < 8)
        newErrors.password = "Password must be at least 8 characters.";
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password.";
      } else if (form.account.password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match.";
      }
      if (!form.store.storeName.trim()) {
        newErrors.storeName = "Store display name is required.";
      }
      if (!form.address.district.trim())
        newErrors.district = "City / District is required.";
    }

    if (targetStep === 2) {
      if (!form.sellerInfo.legalFullName.trim())
        newErrors.legalFullName =
          "Owner full legal name (as on NID) is required.";
      if (
        !form.sellerInfo.nidNumber.trim() ||
        form.sellerInfo.nidNumber.trim().length < 10
      )
        newErrors.nidNumber =
          "Valid 10, 13, or 17 digit National ID (NID) number is required.";
      if (
        form.business.sellerType !== "individual" &&
        !form.business.businessName.trim()
      ) {
        newErrors.businessName =
          "Registered business name is required for business entities.";
      }
      if (!form.business.businessAddress.trim())
        newErrors.businessAddress = "Detailed business address is required.";
      if (!form.address.pickupAddress.trim())
        newErrors.pickupAddress =
          "Warehouse / courier pickup address is required.";
      if (!form.address.returnAddress.trim())
        newErrors.returnAddress = "Return address is required.";
    }

    if (targetStep === 3) {
      if (form.payment.paymentType === "bank") {
        if (!form.payment.bankDetails.accountHolderName.trim())
          newErrors.accountHolderName = "Account holder name is required.";
        if (!form.payment.bankDetails.bankName.trim())
          newErrors.bankName = "Bank name is required.";
        if (!form.payment.bankDetails.branchName.trim())
          newErrors.branchName = "Branch name is required.";
        if (!form.payment.bankDetails.accountNumber.trim())
          newErrors.accountNumber = "Bank account number is required.";
      } else {
        if (
          !form.payment.mfsDetails.walletNumber.trim() ||
          form.payment.mfsDetails.walletNumber.trim().length < 10
        ) {
          newErrors.walletNumber = `Valid ${form.payment.mfsDetails.provider} wallet number is required.`;
        }
      }
    }

    if (targetStep === 4) {
      if (!form.agreements.termsAndConditions)
        newErrors.termsAndConditions =
          "You must accept the Seller Terms & Marketplace Agreement.";
      if (!form.agreements.sellerAgreement)
        newErrors.sellerAgreement =
          "You must confirm that all products listed are authentic.";
      if (!form.agreements.privacyPolicy)
        newErrors.privacyPolicy =
          "You must certify that KYC documents are genuine.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(4, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setSubmitting(true);
    setErrors({});

    try {
      const result = await submitSellerRegistrationOnServer(form);
      if (!result.ok || !result.application) {
        setErrors({
          termsAndConditions:
            result.error ||
            "Could not submit seller application. Please check your details.",
        });
        setSubmitting(false);
        return;
      }

      clearDraftRegistration();
      setSubmittedApp(result.application);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({
        termsAndConditions:
          "Network error while submitting application. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (
    docType: SellerDocumentItem["docType"],
    title: string,
    required: boolean,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    syncForm((prev) => {
      const filtered = prev.documents.filter((d) => d.docType !== docType);
      const nextDoc: SellerDocumentItem = {
        id: `doc-${docType}-${Date.now()}`,
        docType,
        title,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: `/uploads/${file.name}`,
        status: "uploaded",
        required,
      };
      return {
        ...prev,
        documents: [...filtered, nextDoc],
      };
    });
  };

  const getUploadedFileName = (docType: SellerDocumentItem["docType"]) =>
    form.documents.find((d) => d.docType === docType)?.fileName || "";

  if (submittedApp) {
    const fd = submittedApp.formData;
    return (
      <main className="site-content">
        <div className="seller-wizard-shell">
          <div className="seller-submission-confirmation">
            <div className="confirmation-badge-icon">✓</div>
            <span className="confirmation-eyebrow">
              Application Received · Pending Verification
            </span>
            <h1>Your Seller Application Has Been Submitted!</h1>
            <p className="confirmation-lead">
              Thank you, <strong>{fd.account.fullName}</strong>. For marketplace
              security and customer trust, new seller accounts are{" "}
              <strong>not activated immediately</strong>. Our Seller Compliance
              Desk is now reviewing your KYC documents.
            </p>

            <div className="confirmation-id-cards">
              <div className="confirmation-id-box">
                <small>Application Reference ID</small>
                <strong>{submittedApp.applicationId}</strong>
                <span>Use this ID to track verification status</span>
              </div>
              <div className="confirmation-id-box">
                <small>Reserved Seller ID</small>
                <strong>{submittedApp.sellerId}</strong>
                <span>Assigned to {fd.store.storeName}</span>
              </div>
              <div className="confirmation-id-box">
                <small>Current Status</small>
                <strong className="status-pill-review">Under Review</strong>
                <span>Est. review time: 24–48 business hours</span>
              </div>
            </div>

            <div className="confirmation-next-steps">
              <h3>What happens next?</h3>
              <ul>
                <li>
                  <strong>Step 1 — Document &amp; NID Verification:</strong> Our
                  compliance team verifies your National ID and payout account
                  ownership.
                </li>
                <li>
                  <strong>Step 2 — Approval Notification:</strong> Once
                  approved, you will receive an activation confirmation via SMS
                  ({fd.account.mobile}) and email ({fd.account.email}).
                </li>
                <li>
                  <strong>Step 3 — Seller Center Access:</strong> After
                  approval, you can log into the Arozao Seller Center and start
                  listing products.
                </li>
              </ul>
            </div>

            <div className="confirmation-actions">
              <Link
                href={`/sell-on-arozao/application-status?id=${encodeURIComponent(
                  submittedApp.applicationId
                )}`}
                className="button button-primary"
              >
                Track Application Status
              </Link>
              <Link href="/sell-on-arozao" className="button button-secondary">
                Back to Seller Hub
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="site-content">
      <div className="seller-wizard-shell">
        {/* Top Header */}
        <div className="seller-wizard-header">
          <div>
            <Link href="/sell-on-arozao" className="wizard-back-link">
              ← Back to Sell on Arozao
            </Link>
            <h1>Merchant Registration &amp; KYC Onboarding</h1>
            <p>
              Complete the 4-step verification form below to apply for an
              official Arozao Seller Account.
            </p>
          </div>
          <div className="wizard-header-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleSaveDraftManual}
            >
              💾 Save Draft
            </button>
            {draftSavedAlert && (
              <span className="draft-saved-toast">Draft saved!</span>
            )}
          </div>
        </div>

        {/* Stepper Bar */}
        <div className="seller-stepper" role="list">
          {STEPS.map((s) => {
            const isActive = s.id === step;
            const isCompleted = s.id < step;
            return (
              <div
                key={s.id}
                role="listitem"
                className={`seller-step-item ${isActive ? "is-active" : ""} ${
                  isCompleted ? "is-completed" : ""
                }`}
              >
                <div className="step-circle">{isCompleted ? "✓" : s.id}</div>
                <div className="step-text">
                  <small>Step {s.id} of 4</small>
                  <strong>{s.title}</strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form Body */}
        <form className="seller-wizard-card" onSubmit={handleSubmit} noValidate>
          {step === 1 && (
            <div className="wizard-step-pane">
              <div className="pane-header">
                <h2>Step 1: Account &amp; Store Setup</h2>
                <p>
                  Provide your primary contact credentials and choose your
                  unique public store name on Arozao.
                </p>
              </div>

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="s-fullname">Applicant Full Name *</label>
                  <input
                    id="s-fullname"
                    type="text"
                    placeholder="e.g. Tariqul Islam"
                    value={form.account.fullName}
                    onChange={(e) => {
                      clearError("fullName");
                      syncForm((prev) => ({
                        ...prev,
                        account: { ...prev.account, fullName: e.target.value },
                      }));
                    }}
                  />
                  {errors.fullName && (
                    <span className="field-error">{errors.fullName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="s-mobile">Mobile Number (Bangladesh) *</label>
                  <input
                    id="s-mobile"
                    type="tel"
                    placeholder="+880 17XX-XXXXXX"
                    value={form.account.mobile}
                    onChange={(e) => {
                      clearError("mobile");
                      syncForm((prev) => ({
                        ...prev,
                        account: { ...prev.account, mobile: e.target.value },
                      }));
                    }}
                  />
                  {errors.mobile && (
                    <span className="field-error">{errors.mobile}</span>
                  )}
                </div>
              </div>

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="s-email">Business Email Address *</label>
                  <input
                    id="s-email"
                    type="email"
                    placeholder="merchant@yourstore.com"
                    value={form.account.email}
                    onChange={(e) => {
                      clearError("email");
                      syncForm((prev) => ({
                        ...prev,
                        account: { ...prev.account, email: e.target.value },
                      }));
                    }}
                  />
                  {errors.email && (
                    <span className="field-error">{errors.email}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="s-type">Seller Account Type *</label>
                  <select
                    id="s-type"
                    value={form.business.sellerType}
                    onChange={(e) =>
                      syncForm((prev) => ({
                        ...prev,
                        business: {
                          ...prev.business,
                          sellerType: e.target.value as SellerType,
                        },
                      }))
                    }
                  >
                    <option value="individual">
                      Individual / Independent Seller
                    </option>
                    <option value="sole_proprietorship">
                      Sole Proprietorship (Trade License)
                    </option>
                    <option value="partnership">Partnership Firm</option>
                    <option value="private_limited">
                      Private Limited Company (Ltd.)
                    </option>
                    <option value="other">Other Registered Entity</option>
                  </select>
                </div>
              </div>

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="s-pass">Create Password *</label>
                  <input
                    id="s-pass"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={form.account.password || ""}
                    onChange={(e) => {
                      clearError("password");
                      syncForm((prev) => ({
                        ...prev,
                        account: { ...prev.account, password: e.target.value },
                      }));
                    }}
                  />
                  {errors.password && (
                    <span className="field-error">{errors.password}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="s-cpass">Confirm Password *</label>
                  <input
                    id="s-cpass"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => {
                      clearError("confirmPassword");
                      setConfirmPassword(e.target.value);
                    }}
                  />
                  {errors.confirmPassword && (
                    <span className="field-error">
                      {errors.confirmPassword}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="s-store">Unique Store Display Name *</label>
                  <input
                    id="s-store"
                    type="text"
                    placeholder="e.g. Bengal Craft Studio"
                    value={form.store.storeName}
                    onChange={(e) => {
                      clearError("storeName");
                      const name = e.target.value;
                      const slug = name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "");
                      syncForm((prev) => ({
                        ...prev,
                        store: {
                          ...prev.store,
                          storeName: name,
                          storeSlug: slug,
                        },
                      }));
                    }}
                  />
                  {errors.storeName && (
                    <span className="field-error">{errors.storeName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="s-cat">Primary Product Category *</label>
                  <select
                    id="s-cat"
                    value={form.store.categories[0] || "electronics"}
                    onChange={(e) =>
                      syncForm((prev) => ({
                        ...prev,
                        store: {
                          ...prev.store,
                          categories: [e.target.value],
                        },
                      }))
                    }
                  >
                    {SELLER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="s-div">Division *</label>
                  <select
                    id="s-div"
                    value={form.address.division}
                    onChange={(e) =>
                      syncForm((prev) => ({
                        ...prev,
                        address: { ...prev.address, division: e.target.value },
                        business: {
                          ...prev.business,
                          division: e.target.value,
                        },
                      }))
                    }
                  >
                    {BANGLADESH_DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} Division
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="s-city">City / District *</label>
                  <input
                    id="s-city"
                    type="text"
                    placeholder="e.g. Dhaka, Gazipur, Chattogram"
                    value={form.address.district}
                    onChange={(e) => {
                      clearError("district");
                      syncForm((prev) => ({
                        ...prev,
                        address: { ...prev.address, district: e.target.value },
                        business: {
                          ...prev.business,
                          district: e.target.value,
                        },
                      }));
                    }}
                  />
                  {errors.district && (
                    <span className="field-error">{errors.district}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step-pane">
              <div className="pane-header">
                <h2>Step 2: Business &amp; Identity Verification</h2>
                <p>
                  Enter legal identification details exactly as shown on your
                  Bangladesh National ID (NID) or Trade License.
                </p>
              </div>

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="s-legalname">
                    Owner Full Legal Name (as on NID) *
                  </label>
                  <input
                    id="s-legalname"
                    type="text"
                    placeholder="Exact name printed on Smart NID card"
                    value={form.sellerInfo.legalFullName}
                    onChange={(e) => {
                      clearError("legalFullName");
                      syncForm((prev) => ({
                        ...prev,
                        sellerInfo: {
                          ...prev.sellerInfo,
                          legalFullName: e.target.value,
                        },
                      }));
                    }}
                  />
                  {errors.legalFullName && (
                    <span className="field-error">{errors.legalFullName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="s-nid">
                    National ID (NID) / Smart Card Number *
                  </label>
                  <input
                    id="s-nid"
                    type="text"
                    placeholder="10, 13, or 17 digit NID number"
                    value={form.sellerInfo.nidNumber}
                    onChange={(e) => {
                      clearError("nidNumber");
                      syncForm((prev) => ({
                        ...prev,
                        sellerInfo: {
                          ...prev.sellerInfo,
                          nidNumber: e.target.value,
                        },
                      }));
                    }}
                  />
                  {errors.nidNumber && (
                    <span className="field-error">{errors.nidNumber}</span>
                  )}
                </div>
              </div>

              {form.business.sellerType !== "individual" && (
                <div className="form-row form-row-two">
                  <div className="form-group">
                    <label htmlFor="s-bizname">
                      Registered Business / Entity Name *
                    </label>
                    <input
                      id="s-bizname"
                      type="text"
                      placeholder="Legal name on Trade License"
                      value={form.business.businessName}
                      onChange={(e) => {
                        clearError("businessName");
                        syncForm((prev) => ({
                          ...prev,
                          business: {
                            ...prev.business,
                            businessName: e.target.value,
                          },
                        }));
                      }}
                    />
                    {errors.businessName && (
                      <span className="field-error">{errors.businessName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="s-tl">Trade License Number</label>
                    <input
                      id="s-tl"
                      type="text"
                      placeholder="e.g. TRAD/DNCC/123456/2024"
                      value={form.business.tradeLicenseNumber || ""}
                      onChange={(e) =>
                        syncForm((prev) => ({
                          ...prev,
                          business: {
                            ...prev.business,
                            tradeLicenseNumber: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              <div className="form-row form-row-two">
                <div className="form-group">
                  <label htmlFor="s-tin">
                    TIN / BIN Tax Registration Number (Optional)
                  </label>
                  <input
                    id="s-tin"
                    type="text"
                    placeholder="12-digit e-TIN or BIN"
                    value={form.business.tinNumber || ""}
                    onChange={(e) =>
                      syncForm((prev) => ({
                        ...prev,
                        business: {
                          ...prev.business,
                          tinNumber: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="s-bizaddr">
                    Registered Business / Shop Address *
                  </label>
                  <input
                    id="s-bizaddr"
                    type="text"
                    placeholder="House, Road, Area, Postcode"
                    value={form.business.businessAddress}
                    onChange={(e) => {
                      clearError("businessAddress");
                      syncForm((prev) => ({
                        ...prev,
                        business: {
                          ...prev.business,
                          businessAddress: e.target.value,
                        },
                        address: {
                          ...prev.address,
                          presentAddress: e.target.value,
                        },
                      }));
                    }}
                  />
                  {errors.businessAddress && (
                    <span className="field-error">
                      {errors.businessAddress}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="s-pickup">
                  Warehouse / Courier Pickup Address *
                </label>
                <input
                  id="s-pickup"
                  type="text"
                  placeholder="Exact address where Arozao Express riders will pick up parcels"
                  value={form.address.pickupAddress}
                  onChange={(e) => {
                    clearError("pickupAddress");
                    const val = e.target.value;
                    syncForm((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        pickupAddress: val,
                        returnAddress: prev.address.pickupSameAsBusiness
                          ? val
                          : prev.address.returnAddress,
                      },
                    }));
                  }}
                />
                {errors.pickupAddress && (
                  <span className="field-error">{errors.pickupAddress}</span>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={form.address.pickupSameAsBusiness}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      syncForm((prev) => ({
                        ...prev,
                        address: {
                          ...prev.address,
                          pickupSameAsBusiness: checked,
                          returnAddress: checked
                            ? prev.address.pickupAddress
                            : prev.address.returnAddress,
                        },
                      }));
                    }}
                  />
                  <span>Return address is the same as pickup address</span>
                </label>
              </div>

              {!form.address.pickupSameAsBusiness && (
                <div className="form-group">
                  <label htmlFor="s-return">Return Address *</label>
                  <input
                    id="s-return"
                    type="text"
                    placeholder="Address for returned or undelivered customer orders"
                    value={form.address.returnAddress}
                    onChange={(e) => {
                      clearError("returnAddress");
                      syncForm((prev) => ({
                        ...prev,
                        address: {
                          ...prev.address,
                          returnAddress: e.target.value,
                        },
                      }));
                    }}
                  />
                  {errors.returnAddress && (
                    <span className="field-error">{errors.returnAddress}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step-pane">
              <div className="pane-header">
                <h2>Step 3: Bank &amp; MFS Payout Information</h2>
                <p>
                  Choose how you want to receive weekly sales settlements. The
                  account holder name should match your NID or Trade License.
                </p>
              </div>

              <div className="payout-method-selector">
                {(
                  [
                    {
                      id: "bank",
                      type: "bank",
                      label: "🏦 Commercial Bank Transfer (BEFTN)",
                    },
                    {
                      id: "bKash",
                      type: "mfs",
                      label: "📱 bKash Merchant / Personal",
                    },
                    { id: "Nagad", type: "mfs", label: "📱 Nagad Wallet" },
                    { id: "Rocket", type: "mfs", label: "📱 Rocket (DBBL)" },
                  ] as const
                ).map((item) => {
                  const isSelected =
                    item.type === "bank"
                      ? form.payment.paymentType === "bank"
                      : form.payment.paymentType === "mfs" &&
                        form.payment.mfsDetails.provider === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`payout-option-btn ${
                        isSelected ? "is-selected" : ""
                      }`}
                      onClick={() =>
                        syncForm((prev) => ({
                          ...prev,
                          payment: {
                            ...prev.payment,
                            paymentType: item.type as PaymentMethodType,
                            mfsDetails:
                              item.type === "mfs"
                                ? {
                                    ...prev.payment.mfsDetails,
                                    provider: item.id as MfsProvider,
                                  }
                                : prev.payment.mfsDetails,
                          },
                        }))
                      }
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {form.payment.paymentType === "bank" ? (
                <>
                  <div className="form-group">
                    <label htmlFor="s-accname">
                      Beneficiary / Account Holder Name *
                    </label>
                    <input
                      id="s-accname"
                      type="text"
                      placeholder="Must match Owner Legal Name or Registered Business Name"
                      value={form.payment.bankDetails.accountHolderName}
                      onChange={(e) => {
                        clearError("accountHolderName");
                        syncForm((prev) => ({
                          ...prev,
                          payment: {
                            ...prev.payment,
                            bankDetails: {
                              ...prev.payment.bankDetails,
                              accountHolderName: e.target.value,
                            },
                          },
                        }));
                      }}
                    />
                    {errors.accountHolderName && (
                      <span className="field-error">
                        {errors.accountHolderName}
                      </span>
                    )}
                  </div>

                  <div className="form-row form-row-two">
                    <div className="form-group">
                      <label htmlFor="s-bank">Bank Name *</label>
                      <input
                        id="s-bank"
                        type="text"
                        placeholder="e.g. City Bank PLC, BRAC Bank, Dutch-Bangla Bank"
                        value={form.payment.bankDetails.bankName}
                        onChange={(e) => {
                          clearError("bankName");
                          syncForm((prev) => ({
                            ...prev,
                            payment: {
                              ...prev.payment,
                              bankDetails: {
                                ...prev.payment.bankDetails,
                                bankName: e.target.value,
                              },
                            },
                          }));
                        }}
                      />
                      {errors.bankName && (
                        <span className="field-error">{errors.bankName}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="s-branch">Branch Name *</label>
                      <input
                        id="s-branch"
                        type="text"
                        placeholder="e.g. Gulshan Avenue Branch"
                        value={form.payment.bankDetails.branchName}
                        onChange={(e) => {
                          clearError("branchName");
                          syncForm((prev) => ({
                            ...prev,
                            payment: {
                              ...prev.payment,
                              bankDetails: {
                                ...prev.payment.bankDetails,
                                branchName: e.target.value,
                              },
                            },
                          }));
                        }}
                      />
                      {errors.branchName && (
                        <span className="field-error">{errors.branchName}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-row form-row-two">
                    <div className="form-group">
                      <label htmlFor="s-accnum">Bank Account Number *</label>
                      <input
                        id="s-accnum"
                        type="text"
                        placeholder="13 to 17 digit bank account number"
                        value={form.payment.bankDetails.accountNumber}
                        onChange={(e) => {
                          clearError("accountNumber");
                          syncForm((prev) => ({
                            ...prev,
                            payment: {
                              ...prev.payment,
                              bankDetails: {
                                ...prev.payment.bankDetails,
                                accountNumber: e.target.value,
                              },
                            },
                          }));
                        }}
                      />
                      {errors.accountNumber && (
                        <span className="field-error">
                          {errors.accountNumber}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="s-routing">
                        Routing Number (Optional)
                      </label>
                      <input
                        id="s-routing"
                        type="text"
                        placeholder="9-digit Bangladesh Bank routing number"
                        value={form.payment.bankDetails.routingNumber}
                        onChange={(e) =>
                          syncForm((prev) => ({
                            ...prev,
                            payment: {
                              ...prev.payment,
                              bankDetails: {
                                ...prev.payment.bankDetails,
                                routingNumber: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="form-row form-row-two">
                  <div className="form-group">
                    <label htmlFor="s-mfsnum">
                      {form.payment.mfsDetails.provider} Wallet Number *
                    </label>
                    <input
                      id="s-mfsnum"
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={form.payment.mfsDetails.walletNumber}
                      onChange={(e) => {
                        clearError("walletNumber");
                        syncForm((prev) => ({
                          ...prev,
                          payment: {
                            ...prev.payment,
                            mfsDetails: {
                              ...prev.payment.mfsDetails,
                              walletNumber: e.target.value,
                            },
                          },
                        }));
                      }}
                    />
                    {errors.walletNumber && (
                      <span className="field-error">{errors.walletNumber}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="s-mfstype">Wallet Account Type</label>
                    <select
                      id="s-mfstype"
                      value={form.payment.mfsDetails.accountType}
                      onChange={(e) =>
                        syncForm((prev) => ({
                          ...prev,
                          payment: {
                            ...prev.payment,
                            mfsDetails: {
                              ...prev.payment.mfsDetails,
                              accountType: e.target.value as
                                | "personal"
                                | "merchant",
                            },
                          },
                        }))
                      }
                    >
                      <option value="personal">Personal Wallet</option>
                      <option value="merchant">Merchant Account</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step-pane">
              <div className="pane-header">
                <h2>Step 4: KYC Document Upload &amp; Legal Declaration</h2>
                <p>
                  Upload clear photos or PDF scans of your verification
                  documents. All files are encrypted and reviewed exclusively by
                  the Arozao Compliance Team.
                </p>
              </div>

              <div className="kyc-upload-grid">
                <div className="kyc-upload-box">
                  <label>National ID (NID) — Front Side *</label>
                  <p>
                    Clear color photo or scan showing full name &amp; NID number
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      handleFileUpload("nid_front", "NID Front", true, e)
                    }
                  />
                  {getUploadedFileName("nid_front") && (
                    <span className="uploaded-file-pill">
                      📎 {getUploadedFileName("nid_front")}
                    </span>
                  )}
                </div>

                <div className="kyc-upload-box">
                  <label>National ID (NID) — Back Side *</label>
                  <p>Showing barcode and permanent address clearly</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      handleFileUpload("nid_back", "NID Back", true, e)
                    }
                  />
                  {getUploadedFileName("nid_back") && (
                    <span className="uploaded-file-pill">
                      📎 {getUploadedFileName("nid_back")}
                    </span>
                  )}
                </div>

                <div className="kyc-upload-box">
                  <label>Owner Portrait / Live Selfie *</label>
                  <p>Recent passport-style photo of the registered applicant</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileUpload(
                        "selfie_verification",
                        "Owner Portrait",
                        true,
                        e
                      )
                    }
                  />
                  {getUploadedFileName("selfie_verification") && (
                    <span className="uploaded-file-pill">
                      📎 {getUploadedFileName("selfie_verification")}
                    </span>
                  )}
                </div>

                <div className="kyc-upload-box">
                  <label>
                    Trade License Scan{" "}
                    {form.business.sellerType !== "individual"
                      ? "*"
                      : "(Optional)"}
                  </label>
                  <p>
                    Required for Sole Proprietorship, Partnership &amp; Ltd.
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      handleFileUpload(
                        "trade_license",
                        "Trade License",
                        form.business.sellerType !== "individual",
                        e
                      )
                    }
                  />
                  {getUploadedFileName("trade_license") && (
                    <span className="uploaded-file-pill">
                      📎 {getUploadedFileName("trade_license")}
                    </span>
                  )}
                </div>

                <div className="kyc-upload-box">
                  <label>Bank Cheque Leaf / Statement (Optional)</label>
                  <p>
                    Cancelled cheque leaf or MFS screenshot for faster payout
                    verification
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      handleFileUpload(
                        "bank_cheque_or_statement",
                        "Bank Proof",
                        false,
                        e
                      )
                    }
                  />
                  {getUploadedFileName("bank_cheque_or_statement") && (
                    <span className="uploaded-file-pill">
                      📎 {getUploadedFileName("bank_cheque_or_statement")}
                    </span>
                  )}
                </div>
              </div>

              <div className="wizard-checkbox-group">
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={form.agreements.termsAndConditions}
                    onChange={(e) => {
                      clearError("termsAndConditions");
                      syncForm((prev) => ({
                        ...prev,
                        agreements: {
                          ...prev.agreements,
                          termsAndConditions: e.target.checked,
                        },
                      }));
                    }}
                  />
                  <span>
                    I have read and agree to the{" "}
                    <strong>Arozao Marketplace Seller Agreement</strong>,
                    commission schedule, and return policy. *
                  </span>
                </label>
                {errors.termsAndConditions && (
                  <span className="field-error">
                    {errors.termsAndConditions}
                  </span>
                )}

                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={form.agreements.sellerAgreement}
                    onChange={(e) => {
                      clearError("sellerAgreement");
                      syncForm((prev) => ({
                        ...prev,
                        agreements: {
                          ...prev.agreements,
                          sellerAgreement: e.target.checked,
                        },
                      }));
                    }}
                  />
                  <span>
                    I pledge to list only{" "}
                    <strong>100% authentic, genuine products</strong> and
                    understand that counterfeit goods result in immediate
                    account termination. *
                  </span>
                </label>
                {errors.sellerAgreement && (
                  <span className="field-error">{errors.sellerAgreement}</span>
                )}

                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={form.agreements.privacyPolicy}
                    onChange={(e) => {
                      clearError("privacyPolicy");
                      syncForm((prev) => ({
                        ...prev,
                        agreements: {
                          ...prev.agreements,
                          privacyPolicy: e.target.checked,
                        },
                      }));
                    }}
                  />
                  <span>
                    I declare that all NID, business, and banking details
                    submitted above are true and belong to me. *
                  </span>
                </label>
                {errors.privacyPolicy && (
                  <span className="field-error">{errors.privacyPolicy}</span>
                )}
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="wizard-footer-nav">
            {step > 1 ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={handleBack}
              >
                ← Previous Step
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                className="button button-primary"
                onClick={handleNext}
              >
                Continue to Step {step + 1} →
              </button>
            ) : (
              <button
                type="submit"
                className="button button-primary"
                disabled={submitting}
              >
                {submitting
                  ? "Submitting Application..."
                  : "✓ Submit Application for KYC Review"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
