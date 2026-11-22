"use client";

import "./seller-theme.css";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PanelShell, { SELLER_PANEL_LINKS } from "@/components/panels/PanelShell";
import {
  fetchCurrentProfile,
  getAuthAccessToken,
  logoutUser,
  SessionUser,
} from "@/lib/auth";
import { setSellerSession, logoutSeller } from "@/lib/seller";
import { SellerSession } from "@/types/seller";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SellerSession | null>(null);
  const [authUser, setAuthUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [accessNotice, setAccessNotice] = useState("");

  useEffect(() => {
    if (pathname === "/seller/login") {
      setHydrated(true);
      return;
    }

    let cancelled = false;

    async function verifySellerSession() {
      setAccessNotice("");
      setHydrated(false);
      const verifiedUser = await fetchCurrentProfile();
      if (cancelled) return;

      if (
        !verifiedUser ||
        (verifiedUser.role !== "seller" &&
          verifiedUser.role !== "admin" &&
          verifiedUser.role !== "super_admin")
      ) {
        logoutSeller();
        router.replace("/seller/login");
        return;
      }
      if (!verifiedUser) {
        setAccessNotice("Sign in to a seller account to continue.");
        setHydrated(true);
        return;
      }
      const authenticatedUser: SessionUser = verifiedUser;

      try {
        const storeRes = await fetch("/api/seller/store", {
          credentials: "include",
          cache: "no-store",
        });
        const storeData = await storeRes.json();
        if (cancelled) return;

        if (!storeRes.ok || !storeData?.ok || !storeData.store) {
          setAccessNotice(
            storeData?.error ||
              "This login has no seller profile linked to it. Submit a seller application, or contact support if you already applied."
          );
          setHydrated(true);
          return;
        }

        const status = String(storeData.store.status || "").toLowerCase();
        if (status !== "approved") {
          setAccessNotice(
            status === "pending" || status === "under_review"
              ? "Your seller application is awaiting review. Seller Center will be available after approval."
              : `Seller Center access is unavailable because this seller account is ${status || "not approved"}.`
          );
          setHydrated(true);
          return;
        }

        const verifiedSellerSession: SellerSession = {
          sellerId: storeData.store.seller_code,
          applicationId: "",
          name: authenticatedUser.name,
          email: authenticatedUser.email,
          storeName: storeData.store.store_name || authenticatedUser.name,
          storeSlug: storeData.store.store_slug || "merchant-store",
          status: "Approved",
        };
        setAuthUser(verifiedUser);
        setSellerSession(verifiedSellerSession);
        setSession(verifiedSellerSession);
        setHydrated(true);
        return;
      } catch (error) {
        if (cancelled) return;
        setAccessNotice(
          error instanceof Error
            ? error.message
            : "Could not verify the seller profile. Please try again later."
        );
        setHydrated(true);
        return;
      }

      // Load authoritative store metadata from /api/seller/store
      try {
        const token = getAuthAccessToken();
        const res = await fetch("/api/seller/store", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data?.store) {
            const verifiedSellerSession: SellerSession = {
              sellerId: data.store.seller_code || "ARZ-SLR-00001",
              applicationId: "APP-VERIFIED",
              name: authenticatedUser.name,
              email: authenticatedUser.email,
              storeName: data.store.store_name || authenticatedUser.name,
              storeSlug: data.store.store_slug || "merchant-store",
              status: "Approved",
            };
            setSellerSession(verifiedSellerSession);
            setSession(verifiedSellerSession);
            setHydrated(true);
            return;
          }
        }
      } catch {
        // Fallback to verified user identity if store lookup fails
      }

      const fallbackSession: SellerSession = {
        sellerId: "ARZ-SLR-00001",
        applicationId: "APP-VERIFIED",
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        storeName: authenticatedUser.name,
        storeSlug: "merchant-store",
        status: "Approved",
      };
      setSellerSession(fallbackSession);
      setSession(fallbackSession);
      setHydrated(true);
    }

    void verifySellerSession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (pathname === "/seller/login") {
    return <>{children}</>;
  }

  if (hydrated && accessNotice) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <h1>Seller Center unavailable</h1>
          <p>{accessNotice}</p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <a className="button button-primary" href="/sell-on-arozao/register">
              Apply to sell
            </a>
            <a
              className="button button-secondary"
              href="/sell-on-arozao/application-status"
            >
              Check application status
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (!hydrated || !authUser) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <p>Verifying Seller Center authorization...</p>
        </div>
      </main>
    );
  }

  const handleLogout = async () => {
    logoutSeller();
    await logoutUser();
    router.push("/seller/login");
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
      />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap"
      />
      <PanelShell
        panel="seller"
        links={SELLER_PANEL_LINKS}
        user={authUser}
        contextLabel={session?.storeName}
        onLogout={handleLogout}
      >
        <main className="container-fluid p-0">{children}</main>
      </PanelShell>
    </>
  );
}
