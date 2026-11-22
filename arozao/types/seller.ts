export type SellerType =
  | "individual"
  | "sole_proprietorship"
  | "partnership"
  | "private_limited"
  | "other";

export type ApplicationStatus =
  | "Draft"
  | "Under Review"
  | "Action Required"
  | "Approved"
  | "Rejected"
  | "Suspended";

export type PaymentMethodType = "bank" | "mfs";

export type MfsProvider = "bKash" | "Nagad" | "Rocket" | "Upay";

export interface SellerAccountStepData {
  fullName: string;
  email: string;
  mobile: string;
  password?: string;
  isOtpVerified: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export interface SellerBusinessStepData {
  sellerType: SellerType;
  businessName: string;
  businessAddress: string;
  division: string;
  district: string;
  country: string;
  tradeLicenseNumber?: string;
  tinNumber?: string;
  binVatNumber?: string;
  companyRegNumber?: string;
}

export interface SellerInfoStepData {
  legalFullName: string;
  fathersName: string;
  mothersName: string;
  dateOfBirth: string;
  nationality: string;
  nidNumber: string;
  nidType: "10_digit_smart" | "13_digit_old" | "17_digit_old";
  role: "owner" | "authorized_representative";
  repDesignation?: string;
  contactMobile: string;
  contactEmail: string;
}

export interface SellerAddressStepData {
  presentAddress: string;
  permanentAddress: string;
  sameAsPresent: boolean;
  division: string;
  district: string;
  upazila: string;
  area: string;
  postalCode: string;
  contactPhone: string;
  returnAddress: string;
  pickupAddress: string;
  pickupSameAsBusiness: boolean;
}

export interface SellerPaymentStepData {
  paymentType: PaymentMethodType;
  bankDetails: {
    accountHolderName: string;
    bankName: string;
    branchName: string;
    accountNumber: string;
    routingNumber: string;
  };
  mfsDetails: {
    provider: MfsProvider;
    walletNumber: string;
    accountType: "merchant" | "personal";
  };
}

export interface SellerStoreStepData {
  storeName: string;
  storeSlug: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  categories: string[];
  subcategories: string[];
}

export interface SellerDocumentItem {
  id: string;
  docType:
    | "nid_front"
    | "nid_back"
    | "trade_license"
    | "tin_certificate"
    | "bin_vat_certificate"
    | "bank_cheque_or_statement"
    | "utility_bill"
    | "selfie_verification";
  title: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  status: "uploaded" | "verified" | "rejected";
  required: boolean;
}

export interface SellerRegistrationFormData {
  account: SellerAccountStepData;
  business: SellerBusinessStepData;
  sellerInfo: SellerInfoStepData;
  address: SellerAddressStepData;
  payment: SellerPaymentStepData;
  store: SellerStoreStepData;
  documents: SellerDocumentItem[];
  agreements: {
    termsAndConditions: boolean;
    sellerAgreement: boolean;
    privacyPolicy: boolean;
  };
}

export interface SellerApplication {
  id: string;
  applicationId: string;
  sellerId: string;
  currentStep: number;
  formData: SellerRegistrationFormData;
  status: ApplicationStatus;
  rejectionReason?: string;
  actionRequiredNote?: string;
  submittedAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

export interface SellerSession {
  sellerId: string;
  applicationId: string;
  name: string;
  email: string;
  storeName: string;
  storeSlug: string;
  status: ApplicationStatus;
  token?: string;
}

export interface SellerProductItem {
  id: string;
  slug?: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  stock: number;
  lowStockThreshold?: number;
  status: "active" | "draft" | "out-of-stock" | "archived";
  salesCount: number;
  image: string;
  description?: string;
  createdAt: string;
}

export interface SellerOrderItem {
  id: string;
  orderNumber: string;
  parentOrderNumber?: string;
  productName: string;
  customerName: string;
  customerPhone?: string;
  customerCity: string;
  shippingAddress?: string;
  amount: number;
  netSellerPayable?: number;
  commissionAmount?: number;
  commissionRate?: number;
  paymentStatus: "Paid (Online)" | "Cash on Delivery";
  fulfillmentStatus:
    | "Pending Dispatch"
    | "Packed"
    | "Handed to Courier"
    | "In Transit"
    | "Delivered"
    | "Cancelled";
  courierPartner?: string;
  trackingCode?: string;
  orderDate: string;
  createdAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  items?: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

export interface SellerPayoutRecord {
  id: string;
  payoutDate: string;
  amount: number;
  method: string;
  referenceNumber: string;
  status: "Completed" | "Processing" | "Pending" | "Failed";
}
