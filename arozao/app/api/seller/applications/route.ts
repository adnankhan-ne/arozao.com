import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type PhpEnvelope = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: unknown;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function statusLabel(value: unknown): string {
  switch (asText(value).toLowerCase()) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "suspended":
      return "Suspended";
    case "action_required":
      return "Action Required";
    default:
      return "Under Review";
  }
}

function mapApplication(value: unknown) {
  const seller = asRecord(value);
  const id = String(seller.id ?? seller.slug ?? "");
  return {
    id,
    applicationId: `SEL-${id}`,
    sellerId: `SEL-${id}`,
    status: statusLabel(seller.status),
    submittedAt: asText(seller.created_at),
    storeName: asText(seller.store_name),
  };
}

function responseWithAuth(
  body: JsonRecord,
  status: number,
  token?: string
) {
  const response = NextResponse.json(body, { status });
  if (token) {
    response.cookies.set("arozao-access-token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}

function requestWithToken(request: NextRequest, token: string) {
  return new NextRequest(request.url, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export async function GET(request: NextRequest) {
  const response = await fetchPhpApi(request, "seller/application-status");
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success || !payload.data) {
    return NextResponse.json(
      {
        ok: false,
        error:
          payload.message ||
          payload.error ||
          "Sign in with the account used for your seller application to check its status.",
      },
      { status: response.status || 502 }
    );
  }

  const application = mapApplication(payload.data);
  const { searchParams } = new URL(request.url);
  return NextResponse.json(
    searchParams.get("list") === "recent"
      ? { ok: true, applications: [application] }
      : { ok: true, application }
  );
}

export async function POST(request: NextRequest) {
  let body: JsonRecord;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid seller application is required." },
      { status: 400 }
    );
  }

  const form = asRecord(body.formData);
  const account = asRecord(form.account);
  const sellerInfo = asRecord(form.sellerInfo);
  const business = asRecord(form.business);
  const address = asRecord(form.address);
  const payment = asRecord(form.payment);
  const bank = asRecord(payment.bankDetails);
  const mfs = asRecord(payment.mfsDetails);
  const store = asRecord(form.store);
  const documents = Array.isArray(form.documents)
    ? form.documents.map(asRecord)
    : [];
  if (
    documents.some(
      (document) => asText(document.fileName) || asText(document.fileUrl)
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Verification document uploads are not connected to secure backend storage yet. Your application was not submitted; contact seller support for document submission.",
      },
      { status: 501 }
    );
  }

  const email = asText(account.email).toLowerCase();
  const password = typeof account.password === "string" ? account.password : "";
  const fullName = asText(sellerInfo.legalFullName) || asText(account.fullName);
  const storeName = asText(store.storeName);
  const nidNumber = asText(sellerInfo.nidNumber);
  if (!email || !password || password.length < 8 || !fullName || !storeName || nidNumber.length < 10) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Complete the required account, store, and identity fields. Passwords must be at least 8 characters.",
      },
      { status: 422 }
    );
  }

  const businessTypeMap: Record<string, string> = {
    individual: "individual",
    sole_proprietorship: "proprietorship",
    partnership: "limited",
    private_limited: "limited",
  };
  const businessType = businessTypeMap[asText(business.sellerType)];
  if (!businessType) {
    return NextResponse.json(
      {
        ok: false,
        error: "Select an individual, sole proprietorship, partnership, or private limited business type.",
      },
      { status: 422 }
    );
  }

  const paymentType = asText(payment.paymentType);
  const provider = asText(mfs.provider).toLowerCase();
  const payoutMethod =
    paymentType === "bank"
      ? "bank"
      : provider === "bkash" || provider === "nagad"
      ? provider
      : "";
  if (!payoutMethod) {
    return NextResponse.json(
      { ok: false, error: "The backend currently supports bank, bKash, and Nagad payouts only." },
      { status: 422 }
    );
  }

  const existingToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.cookies.get("arozao-access-token")?.value ||
    "";
  let token = existingToken;
  let newlyCreatedAccount = false;

  if (existingToken) {
    const profileResponse = await fetchPhpApi(request, "auth/me", undefined, "GET");
    const profilePayload = (await profileResponse.json()) as PhpEnvelope;
    const profile = asRecord(profilePayload.data);
    if (!profileResponse.ok || !profilePayload.success) {
      return NextResponse.json(
        { ok: false, error: "Your login session has expired. Sign in again and resubmit the application." },
        { status: profileResponse.status || 401 }
      );
    }
    if (asText(profile.email).toLowerCase() !== email) {
      return NextResponse.json(
        { ok: false, error: "The application email must match the signed-in account. Sign in with the intended account and try again." },
        { status: 409 }
      );
    }
  } else {
    const registerResponse = await fetchPhpApi(
      request,
      "auth/register",
      {
        full_name: fullName,
        email,
        phone: asText(account.mobile),
        password,
        password_confirmation: password,
      },
      "POST"
    );
    const registerPayload = (await registerResponse.json()) as PhpEnvelope;
    const registerData = asRecord(registerPayload.data);
    token = asText(registerData.token);
    if (!registerResponse.ok || !registerPayload.success || !token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            (registerResponse.status === 409
              ? "An account with this email already exists. Sign in at /login with that account, then resubmit the seller application."
              : "") ||
            registerPayload.message ||
            registerPayload.error ||
            "Could not create your account. If you already have an account, sign in first and resubmit.",
        },
        { status: registerResponse.status || 502 }
      );
    }
    newlyCreatedAccount = true;
  }

  const applicationBody = {
    store_name: storeName,
    business_type: businessType,
    nid_number: nidNumber,
    trade_license: asText(business.tradeLicenseNumber),
    warehouse_division: asText(address.division),
    warehouse_district: asText(address.district),
    warehouse_address: asText(address.pickupAddress),
    payout_method: payoutMethod,
    bank_name: asText(bank.bankName),
    bank_branch: asText(bank.branchName),
    bank_account: asText(bank.accountNumber),
    bank_routing: asText(bank.routingNumber),
    mfs_wallet: asText(mfs.walletNumber),
    support_phone: asText(account.mobile),
  };
  const phpRequest = requestWithToken(request, token);
  const applicationResponse = await fetchPhpApi(
    phpRequest,
    "seller/apply",
    applicationBody,
    "POST"
  );
  const applicationPayload =
    (await applicationResponse.json()) as PhpEnvelope;
  if (!applicationResponse.ok || !applicationPayload.success) {
    return responseWithAuth(
      {
        ok: false,
        error:
          applicationPayload.message ||
          applicationPayload.error ||
          "Failed to submit your seller application.",
      },
      applicationResponse.status || 502,
      newlyCreatedAccount ? token : undefined
    );
  }

  const refreshedLogin = await fetchPhpApi(
    request,
    "auth/login",
    { email, password },
    "POST"
  );
  const refreshedPayload = (await refreshedLogin.json()) as PhpEnvelope;
  const refreshedToken = asText(asRecord(refreshedPayload.data).token);
  if (refreshedToken) token = refreshedToken;
  else token = existingToken;

  let application: ReturnType<typeof mapApplication>;
  if (token) {
    const statusRequest = requestWithToken(request, token);
    const statusResponse = await fetchPhpApi(
      statusRequest,
      "seller/application-status",
      undefined,
      "GET"
    );
    const statusPayload = (await statusResponse.json()) as PhpEnvelope;
    application =
      statusPayload.success && statusPayload.data
        ? mapApplication(statusPayload.data)
        : {
            ...mapApplication(
              {
                slug: asRecord(applicationPayload.data).seller_slug,
                store_name: storeName,
                status: "pending",
              }
            ),
            submittedAt: new Date().toISOString(),
          };
  } else {
    application = {
      ...mapApplication(
        {
          slug: asRecord(applicationPayload.data).seller_slug,
          store_name: storeName,
          status: "pending",
        }
      ),
      submittedAt: new Date().toISOString(),
    };
  }

  return responseWithAuth(
    {
      ok: true,
      message: applicationPayload.message || "Seller application submitted for review.",
      application,
    },
    201,
    token
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Document resubmission is not available in the backend yet. Contact seller support to update application documents.",
    },
    { status: 501 }
  );
}
