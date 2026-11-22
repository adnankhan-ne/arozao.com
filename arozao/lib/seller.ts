import {
  SellerApplication,
  SellerRegistrationFormData,
  SellerSession,
  SellerProductItem,
  ApplicationStatus,
} from "@/types/seller";
import { getAuthAccessToken } from "@/lib/auth";

export type { SellerRegistrationFormData };

/**
 * In-memory runtime state only (no localStorage or sessionStorage production data).
 */
let currentSellerSessionMemory: SellerSession | null = null;
let currentDraftMemory: SellerRegistrationFormData | null = null;

export const initialDraftData: SellerRegistrationFormData = {
  account: {
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    isOtpVerified: false,
    termsAccepted: false,
    privacyAccepted: false,
  },
  business: {
    sellerType: "individual",
    businessName: "",
    businessAddress: "",
    division: "Dhaka",
    district: "Dhaka",
    country: "Bangladesh",
    tradeLicenseNumber: "",
    tinNumber: "",
    binVatNumber: "",
    companyRegNumber: "",
  },
  sellerInfo: {
    legalFullName: "",
    fathersName: "",
    mothersName: "",
    dateOfBirth: "",
    nationality: "Bangladeshi",
    nidNumber: "",
    nidType: "10_digit_smart",
    role: "owner",
    contactMobile: "",
    contactEmail: "",
  },
  address: {
    presentAddress: "",
    permanentAddress: "",
    sameAsPresent: false,
    division: "Dhaka",
    district: "Dhaka",
    upazila: "Gulshan",
    area: "Banani",
    postalCode: "1213",
    contactPhone: "",
    returnAddress: "",
    pickupAddress: "",
    pickupSameAsBusiness: true,
  },
  payment: {
    paymentType: "mfs",
    bankDetails: {
      accountHolderName: "",
      bankName: "City Bank Limited",
      branchName: "Gulshan Branch",
      accountNumber: "",
      routingNumber: "225271829",
    },
    mfsDetails: {
      provider: "bKash",
      walletNumber: "",
      accountType: "merchant",
    },
  },
  store: {
    storeName: "",
    storeSlug: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    categories: ["electronics", "gadgets"],
    subcategories: ["phone-accessories"],
  },
  documents: [],
  agreements: {
    termsAndConditions: false,
    sellerAgreement: false,
    privacyPolicy: false,
  },
};

/**
 * Initial database seed structures used exclusively by the server-side
 * seedDemoSellerApplications migration helper when `seller_applications` is empty.
 */
export const seedApplications: SellerApplication[] = [
  {
    id: "app-seed-1",
    applicationId: "APP-2026-10024",
    sellerId: "ARZ-SLR-10024",
    currentStep: 8,
    status: "Approved",
    submittedAt: "2026-09-15T10:30:00Z",
    updatedAt: "2026-09-16T14:20:00Z",
    reviewedAt: "2026-09-16T14:20:00Z",
    reviewerNotes:
      "All documents verified against EC NID database & Trade license valid.",
    formData: {
      ...initialDraftData,
      account: {
        fullName: "Rafiqul Islam",
        email: "rafiq@gadgethubbd.com",
        mobile: "01712345678",
        isOtpVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
      },
      business: {
        sellerType: "sole_proprietorship",
        businessName: "Dhaka Gadget Hub",
        businessAddress:
          "Shop 42, Level 3, Multiplan Centre, New Elephant Road",
        division: "Dhaka",
        district: "Dhaka",
        country: "Bangladesh",
        tradeLicenseNumber: "TRAD/DNCC/049182/2025",
        tinNumber: "781293401928",
        binVatNumber: "002918291-0101",
      },
      sellerInfo: {
        legalFullName: "Md. Rafiqul Islam",
        fathersName: "Abdul Karim",
        mothersName: "Rahima Khatun",
        dateOfBirth: "1988-06-14",
        nationality: "Bangladeshi",
        nidNumber: "1988269182000049",
        nidType: "10_digit_smart",
        role: "owner",
        contactMobile: "01712345678",
        contactEmail: "rafiq@gadgethubbd.com",
      },
      address: {
        presentAddress: "House 12, Road 4, Sector 7, Uttara, Dhaka",
        permanentAddress: "House 12, Road 4, Sector 7, Uttara, Dhaka",
        sameAsPresent: true,
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Uttara",
        area: "Sector 7",
        postalCode: "1230",
        contactPhone: "01712345678",
        returnAddress:
          "Shop 42, Level 3, Multiplan Centre, New Elephant Road, Dhaka",
        pickupAddress:
          "Shop 42, Level 3, Multiplan Centre, New Elephant Road, Dhaka",
        pickupSameAsBusiness: true,
      },
      payment: {
        paymentType: "bank",
        bankDetails: {
          accountHolderName: "Dhaka Gadget Hub",
          bankName: "City Bank Limited",
          branchName: "Elephant Road Branch",
          accountNumber: "1102918201928",
          routingNumber: "225271829",
        },
        mfsDetails: {
          provider: "bKash",
          walletNumber: "01712345678",
          accountType: "merchant",
        },
      },
      store: {
        storeName: "Dhaka Gadget Hub",
        storeSlug: "dhaka-gadget-hub",
        description:
          "Authorized reseller of authentic smartphone audio accessories, smartwatches, and fast charging docks.",
        logoUrl:
          "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=200&q=80",
        bannerUrl:
          "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1200&q=80",
        categories: ["electronics", "gadgets"],
        subcategories: ["phone-accessories", "computer-accessories"],
      },
      documents: [
        {
          id: "doc-1",
          docType: "nid_front",
          title: "NID Front",
          fileName: "nid_front_rafiqul.jpg",
          fileSize: 482000,
          fileUrl: "/docs/mock_nid_front.jpg",
          status: "verified",
          required: true,
        },
        {
          id: "doc-2",
          docType: "trade_license",
          title: "Trade License 2025-2026",
          fileName: "trade_license_dhaka_gadget.pdf",
          fileSize: 1204000,
          fileUrl: "/docs/mock_trade_license.pdf",
          status: "verified",
          required: true,
        },
      ],
      agreements: {
        termsAndConditions: true,
        sellerAgreement: true,
        privacyPolicy: true,
      },
    },
  },
  {
    id: "app-seed-2",
    applicationId: "APP-2026-84192",
    sellerId: "ARZ-SLR-84192",
    currentStep: 8,
    status: "Under Review",
    submittedAt: "2026-09-24T18:45:00Z",
    updatedAt: "2026-09-24T18:45:00Z",
    reviewerNotes:
      "Awaiting NID biometric verification and bank account verification penny-drop.",
    formData: {
      ...initialDraftData,
      account: {
        fullName: "Nusrat Jahan",
        email: "nusrat@bengalcrafts.com",
        mobile: "01819876543",
        isOtpVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
      },
      business: {
        sellerType: "sole_proprietorship",
        businessName: "Bengal Crafts & Lifestyle",
        businessAddress: "House 18, Road 27, Dhanmondi, Dhaka",
        division: "Dhaka",
        district: "Dhaka",
        country: "Bangladesh",
        tradeLicenseNumber: "TRAD/DSCC/019284/2026",
        tinNumber: "491829104928",
      },
      sellerInfo: {
        legalFullName: "Nusrat Jahan",
        fathersName: "Kamal Uddin Ahmed",
        mothersName: "Farida Begum",
        dateOfBirth: "1994-11-20",
        nationality: "Bangladeshi",
        nidNumber: "9182049182",
        nidType: "10_digit_smart",
        role: "owner",
        contactMobile: "01819876543",
        contactEmail: "nusrat@bengalcrafts.com",
      },
      address: {
        presentAddress: "House 18, Road 27, Dhanmondi, Dhaka",
        permanentAddress: "Village: Rampur, Sonargaon, Narayanganj",
        sameAsPresent: false,
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Dhanmondi",
        area: "Dhanmondi 27",
        postalCode: "1209",
        contactPhone: "01819876543",
        returnAddress: "House 18, Road 27, Dhanmondi, Dhaka",
        pickupAddress: "House 18, Road 27, Dhanmondi, Dhaka",
        pickupSameAsBusiness: true,
      },
      payment: {
        paymentType: "mfs",
        bankDetails: {
          accountHolderName: "",
          bankName: "BRAC Bank",
          branchName: "",
          accountNumber: "",
          routingNumber: "",
        },
        mfsDetails: {
          provider: "bKash",
          walletNumber: "01819876543",
          accountType: "merchant",
        },
      },
      store: {
        storeName: "Bengal Crafts & Lifestyle",
        storeSlug: "bengal-crafts-lifestyle",
        description:
          "Handcrafted brass decor, jute planters, and artisan ceramic tableware from heritage artisan clusters in Bangladesh.",
        logoUrl:
          "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=200&q=80",
        bannerUrl:
          "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=80",
        categories: ["home-decor", "lifestyle"],
        subcategories: ["home-decor", "showpieces"],
      },
      documents: [
        {
          id: "doc-b1",
          docType: "nid_front",
          title: "NID Front",
          fileName: "nusrat_nid_front.jpg",
          fileSize: 620000,
          fileUrl: "/docs/mock_nid.jpg",
          status: "uploaded",
          required: true,
        },
        {
          id: "doc-b2",
          docType: "trade_license",
          title: "Trade License",
          fileName: "trade_license_bengal_crafts.pdf",
          fileSize: 840000,
          fileUrl: "/docs/mock_license.pdf",
          status: "uploaded",
          required: true,
        },
      ],
      agreements: {
        termsAndConditions: true,
        sellerAgreement: true,
        privacyPolicy: true,
      },
    },
  },
  {
    id: "app-seed-3",
    applicationId: "APP-2026-45109",
    sellerId: "ARZ-SLR-45109",
    currentStep: 8,
    status: "Action Required",
    submittedAt: "2026-09-22T09:15:00Z",
    updatedAt: "2026-09-23T11:00:00Z",
    actionRequiredNote:
      "Please upload a clear, colored scanned copy of Trade License renewal voucher for 2025-2026. The previous scan was blurred and obscured the expiry date.",
    formData: {
      ...initialDraftData,
      account: {
        fullName: "Tanvir Hasan",
        email: "tanvir@ctgorganic.com",
        mobile: "01911223344",
        isOtpVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
      },
      business: {
        sellerType: "partnership",
        businessName: "Chittagong Organic Store",
        businessAddress: "GEC Circle, Nasirabad, Chittagong",
        division: "Chittagong",
        district: "Chittagong",
        country: "Bangladesh",
        tradeLicenseNumber: "TRAD/CCC/08192/2024",
      },
      sellerInfo: {
        legalFullName: "Tanvir Hasan Chowdhury",
        fathersName: "Mahmud Hasan",
        mothersName: "Suraiya Begum",
        dateOfBirth: "1985-03-22",
        nationality: "Bangladeshi",
        nidNumber: "1985159182000182",
        nidType: "17_digit_old",
        role: "owner",
        contactMobile: "01911223344",
        contactEmail: "tanvir@ctgorganic.com",
      },
      address: {
        presentAddress:
          "House 7, Road 2, Nasirabad Housing Society, Chittagong",
        permanentAddress:
          "House 7, Road 2, Nasirabad Housing Society, Chittagong",
        sameAsPresent: true,
        division: "Chittagong",
        district: "Chittagong",
        upazila: "Panchlaish",
        area: "Nasirabad",
        postalCode: "4000",
        contactPhone: "01911223344",
        returnAddress: "GEC Circle, Nasirabad, Chittagong",
        pickupAddress: "GEC Circle, Nasirabad, Chittagong",
        pickupSameAsBusiness: true,
      },
      payment: {
        paymentType: "bank",
        bankDetails: {
          accountHolderName: "Chittagong Organic Store",
          bankName: "Islami Bank Bangladesh",
          branchName: "GEC Branch",
          accountNumber: "205018291049281",
          routingNumber: "125151829",
        },
        mfsDetails: {
          provider: "bKash",
          walletNumber: "",
          accountType: "merchant",
        },
      },
      store: {
        storeName: "Chittagong Organic Store",
        storeSlug: "chittagong-organic-store",
        description:
          "Pure honey, cold pressed black seed oil, and artisanal herbal health wellness essentials.",
        categories: ["lifestyle", "kitchen-appliances"],
        subcategories: ["lifestyle"],
      },
      documents: [
        {
          id: "doc-c1",
          docType: "trade_license",
          title: "Trade License (Resubmission Required)",
          fileName: "trade_license_ctg.pdf",
          fileSize: 450000,
          fileUrl: "/docs/mock_license.pdf",
          status: "rejected",
          required: true,
        },
      ],
      agreements: {
        termsAndConditions: true,
        sellerAgreement: true,
        privacyPolicy: true,
      },
    },
  },
];

function buildAuthHeaders(): Record<string, string> {
  const token = getAuthAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetches all seller applications from the backend API via `/api/admin/sellers` (Admin)
 * or `/api/seller/applications` (Public/Applicant).
 */
export async function fetchSellerApplicationsFromServer(
  status?: string
): Promise<SellerApplication[]> {
  try {
    const query =
      status && status !== "all"
        ? `?status=${encodeURIComponent(status)}`
        : "";
    const res = await fetch(`/api/admin/sellers${query}`, {
      headers: buildAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && Array.isArray(data.applications)) {
        return data.applications;
      }
    }
    // Fallback for public tracker preview list
    const pubRes = await fetch(`/api/seller/applications?list=recent`, {
      headers: buildAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    });
    if (pubRes.ok) {
      const pubData = await pubRes.json();
      if (pubData?.ok && Array.isArray(pubData.applications)) {
        return pubData.applications;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetches a single seller application from the backend API by applicationId, sellerId, email, or phone.
 */
export async function fetchSellerApplicationByQueryFromServer(
  query: string,
  asAdmin = false
): Promise<SellerApplication | null> {
  if (!query || !query.trim()) return null;
  try {
    const clean = query.trim();
    if (asAdmin) {
      const adminRes = await fetch(
        `/api/admin/sellers/${encodeURIComponent(clean)}`,
        {
          headers: buildAuthHeaders(),
          credentials: "include",
          cache: "no-store",
        }
      );
      if (adminRes.ok) {
        const data = await adminRes.json();
        if (data?.ok && data.application) {
          return data.application;
        }
      }
    }

    const res = await fetch(
      `/api/seller/applications?query=${encodeURIComponent(clean)}`,
      {
        headers: buildAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok && data.application ? data.application : null;
  } catch {
    return null;
  }
}

/**
 * Admin-only server mutation to Approve, Reject, Request Action, or Suspend a seller application.
 */
export async function updateSellerApplicationStatusOnServer(
  applicationId: string,
  newStatus: ApplicationStatus,
  notes?: {
    rejectionReason?: string;
    actionRequiredNote?: string;
    reviewerNotes?: string;
  }
): Promise<{
  ok: boolean;
  application?: SellerApplication;
  error?: string;
}> {
  try {
    const res = await fetch(
      `/api/admin/sellers/${encodeURIComponent(applicationId)}`,
      {
        method: "PATCH",
        headers: buildAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          status: newStatus,
          rejectionReason: notes?.rejectionReason,
          actionRequiredNote: notes?.actionRequiredNote,
          reviewerNotes: notes?.reviewerNotes,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || "Failed to update application status.",
      };
    }
    return {
      ok: true,
      application: data.application,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error updating application status.",
    };
  }
}

/**
 * Applicant-facing server mutation to resubmit a verification document and move status back to "Under Review".
 */
export async function resubmitApplicationDocumentOnServer(
  applicationId: string,
  document?: {
    docType?: string;
    title?: string;
    fileName?: string;
    fileSize?: number;
  }
): Promise<{
  ok: boolean;
  application?: SellerApplication;
  error?: string;
}> {
  try {
    const res = await fetch("/api/seller/applications", {
      method: "PATCH",
      headers: buildAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({
        applicationId,
        document,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || "Failed to resubmit verification document.",
      };
    }
    return {
      ok: true,
      application: data.application,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error resubmitting document.",
    };
  }
}

/**
 * Submits a new seller registration application via `POST /api/seller/applications`.
 */
export async function submitSellerRegistrationOnServer(
  formData: SellerRegistrationFormData
): Promise<{
  ok: boolean;
  application?: SellerApplication;
  error?: string;
}> {
  try {
    const res = await fetch("/api/seller/applications", {
      method: "POST",
      headers: buildAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ formData }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok || !data.application) {
      return {
        ok: false,
        error: data?.error || "Failed to submit seller application.",
      };
    }
    clearDraftRegistration();
    return {
      ok: true,
      application: data.application,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error submitting seller application.",
    };
  }
}

/**
 * Non-authoritative in-memory draft helpers for the multi-step onboarding wizard.
 */
export function getDraftRegistration(): SellerRegistrationFormData {
  if (!currentDraftMemory) {
    currentDraftMemory = structuredClone(initialDraftData);
  }
  return currentDraftMemory;
}

export function saveDraftRegistration(
  data: Partial<SellerRegistrationFormData>
): void {
  const current = getDraftRegistration();
  currentDraftMemory = {
    ...current,
    ...data,
  };
}

export function clearDraftRegistration(): void {
  currentDraftMemory = null;
}

/**
 * In-memory seller session helpers populated after server-side identity verification.
 */
export function getSellerSession(): SellerSession | null {
  return currentSellerSessionMemory;
}

export function setSellerSession(session: SellerSession): void {
  currentSellerSessionMemory = session;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("arozao-seller-session-changed"));
  }
}

export function logoutSeller(): void {
  currentSellerSessionMemory = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("arozao-seller-session-changed"));
  }
}

/**
 * Fetches the authenticated seller's own products and inventory via `GET /api/seller/products`.
 */
export async function fetchSellerProductsFromServer(params?: {
  q?: string;
  category?: string;
  status?: string;
}): Promise<SellerProductItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", params.q);
  if (params?.category && params.category !== "all") {
    searchParams.set("category", params.category);
  }
  if (params?.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await fetch(`/api/seller/products${qs}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || !data?.ok || !Array.isArray(data.products)) {
    throw new Error(data?.error || "Failed to load seller products.");
  }
  return data.products;
}

/**
 * Creates a new product for the authenticated seller via `POST /api/seller/products`.
 */
export async function createSellerProductOnServer(input: {
  name: string;
  sku?: string;
  category: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  stock: number;
  lowStockThreshold?: number;
  description?: string;
  image?: string;
  status?: "active" | "draft" | "out-of-stock";
}): Promise<{
  ok: boolean;
  product?: SellerProductItem;
  error?: string;
}> {
  try {
    const res = await fetch("/api/seller/products", {
      method: "POST",
      headers: buildAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || "Failed to publish product.",
      };
    }
    return {
      ok: true,
      product: data.product,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Network error creating product.",
    };
  }
}

/**
 * Updates an existing seller-owned product (price, stock, status, title, SKU, category, image)
 * via `PATCH /api/seller/products`.
 */
export async function updateSellerProductOnServer(input: {
  productId: string;
  name?: string;
  sku?: string;
  category?: string;
  price?: number;
  regularPrice?: number;
  salePrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  status?: "active" | "draft" | "out-of-stock" | "archived";
  image?: string;
  description?: string;
}): Promise<{
  ok: boolean;
  product?: SellerProductItem;
  error?: string;
}> {
  try {
    const res = await fetch("/api/seller/products", {
      method: "PATCH",
      headers: buildAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || "Failed to update product.",
      };
    }
    return {
      ok: true,
      product: data.product,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Network error updating product.",
    };
  }
}

/**
 * Archives or deletes a seller-owned product via `DELETE /api/seller/products`.
 */
export async function deleteSellerProductOnServer(
  productId: string
): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(
      `/api/seller/products?productId=${encodeURIComponent(productId)}`,
      {
        method: "DELETE",
        headers: buildAuthHeaders(),
        credentials: "include",
      }
    );
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || "Failed to remove product.",
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Network error deleting product.",
    };
  }
}
