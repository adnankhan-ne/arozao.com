"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  Ticket,
  Users,
  X,
  CreditCard,
  FileText,
  BadgeCheck,
  Percent,
} from "lucide-react";
import { fetchCurrentProfile, logoutUser, SessionUser } from "@/lib/auth";

export interface PanelNavigationLink {
  href: string;
  label: string;
  icon: ReactNode;
  group: string;
}

export const ADMIN_PANEL_LINKS: PanelNavigationLink[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: <LayoutDashboard />,
    group: "Workspace",
  },
  {
    href: "/admin/sellers",
    label: "Seller applications",
    icon: <BadgeCheck />,
    group: "Workspace",
  },
  {
    href: "/admin/stores",
    label: "Seller stores",
    icon: <Store />,
    group: "Workspace",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: <ShoppingCart />,
    group: "Operations",
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: <Package />,
    group: "Operations",
  },
  {
    href: "/admin/payouts",
    label: "Payouts",
    icon: <CreditCard />,
    group: "Operations",
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: <Users />,
    group: "Management",
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: <Tag />,
    group: "Management",
  },
  {
    href: "/admin/brands",
    label: "Brands",
    icon: <Store />,
    group: "Management",
  },
  {
    href: "/admin/coupons",
    label: "Coupons",
    icon: <Ticket />,
    group: "Management",
  },
  {
    href: "/admin/commissions",
    label: "Commissions",
    icon: <Percent />,
    group: "Management",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit log",
    icon: <FileText />,
    group: "Management",
  },
];

export const SELLER_PANEL_LINKS: PanelNavigationLink[] = [
  {
    href: "/seller/dashboard",
    label: "Overview",
    icon: <LayoutDashboard />,
    group: "Workspace",
  },
  {
    href: "/seller/products",
    label: "Products",
    icon: <Package />,
    group: "Workspace",
  },
  {
    href: "/seller/products/add",
    label: "Add product",
    icon: <Tag />,
    group: "Workspace",
  },
  {
    href: "/seller/orders",
    label: "Orders",
    icon: <ShoppingCart />,
    group: "Operations",
  },
  {
    href: "/seller/payments",
    label: "Payments",
    icon: <CreditCard />,
    group: "Operations",
  },
  {
    href: "/seller/store",
    label: "My storefront",
    icon: <Store />,
    group: "Management",
  },
  {
    href: "/seller/settings",
    label: "Settings",
    icon: <Settings />,
    group: "Management",
  },
];

interface PanelShellProps {
  panel: "admin" | "seller";
  links: PanelNavigationLink[];
  children: ReactNode;
  user?: SessionUser | null;
  contextLabel?: string;
  onLogout?: () => void | Promise<void>;
}

export default function PanelShell({
  panel,
  links,
  children,
  user = null,
  contextLabel,
  onLogout,
}: PanelShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelUser, setPanelUser] = useState<SessionUser | null>(user);
  const isAdmin = panel === "admin";
  const title = isAdmin ? "Sales analytics" : "Seller Center";

  useEffect(() => {
    setPanelUser(user);
  }, [user]);

  useEffect(() => {
    if (!isAdmin || user) return;

    let cancelled = false;
    void fetchCurrentProfile().then((profile) => {
      if (!cancelled) setPanelUser(profile);
    });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, user]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    const destination = isAdmin ? "/admin/products" : "/seller/products";
    window.dispatchEvent(
      new CustomEvent("arozao-panel-search", { detail: { query } })
    );
    router.push(`${destination}?search=${encodeURIComponent(query)}`);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }

    await logoutUser();
    router.push("/login");
  };

  const groups = Array.from(new Set(links.map((link) => link.group)));
  const notificationHref = isAdmin ? "/admin/audit-logs" : "/seller/orders";

  return (
    <div
      className={`arozao-panel ${
        isAdmin ? "" : "seller-theme d-flex min-vh-100 bg-light"
      }`}
      data-panel={panel}
    >
      {isAdmin && (
        <>
          <link rel="stylesheet" href="/panel-assets/mdb.min.css" />
          <link rel="stylesheet" href="/panel-assets/panel-shell.css" />
          <Script
            src="/panel-assets/mdb.min.js"
            strategy="afterInteractive"
          />
        </>
      )}
      {sidebarOpen && (
        <button
          type="button"
          className={
            isAdmin
              ? "arozao-panel-backdrop"
              : "position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 border-0 d-lg-none z-2"
          }
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={
          isAdmin
            ? `arozao-panel-sidebar sidenav ${sidebarOpen ? "is-open" : ""}`
            : sidebarOpen
            ? "d-flex flex-column flex-shrink-0 bg-white border-end p-3 position-fixed top-0 start-0 vh-100 w-75 z-3"
            : "d-none d-lg-flex flex-column flex-shrink-0 bg-white border-end p-3 position-sticky top-0 vh-100 overflow-y-auto col-lg-3 col-xl-2"
        }
        aria-label={`${title} navigation`}
      >
        <Link
          href={isAdmin ? "/admin" : "/seller/dashboard"}
          className={
            isAdmin
              ? "arozao-panel-brand navbar-brand"
              : "d-flex align-items-center gap-2 text-decoration-none text-dark mb-4"
          }
          onClick={() => setSidebarOpen(false)}
        >
          <span
            className={
              isAdmin
                ? "arozao-panel-brand-mark"
                : "d-inline-flex align-items-center justify-content-center rounded-3 bg-dark text-white fw-bold p-2"
            }
          >
            A
          </span>
          <span className={isAdmin ? "" : "d-flex flex-column lh-sm"}>
            <strong>Arozao</strong>
            <small className={isAdmin ? "" : "text-secondary"}>
              {isAdmin ? "Marketplace admin" : "Seller Center"}
            </small>
          </span>
        </Link>

        <nav className={isAdmin ? "arozao-panel-navigation" : "flex-grow-1"}>
          {groups.map((group) => (
            <div
              className={isAdmin ? "arozao-panel-nav-group" : "mb-4"}
              key={group}
            >
              <span
                className={
                  isAdmin
                    ? "arozao-panel-nav-heading"
                    : "d-block small text-secondary text-uppercase fw-bold px-2 mb-2"
                }
              >
                {group}
              </span>
              {links
                .filter((link) => link.group === group)
                .map((link) => {
                  const active =
                    pathname === link.href ||
                    (isAdmin &&
                      link.href === "/admin" &&
                      pathname === "/admin/dashboard") ||
                    (link.href !== "/admin" &&
                      link.href !== "/seller/dashboard" &&
                      link.href !== "/seller/products" &&
                      pathname.startsWith(`${link.href}/`));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={
                        isAdmin
                          ? `arozao-panel-nav-link ${active ? "is-active" : ""}`
                          : `d-flex align-items-center gap-2 rounded-3 px-3 py-2 mb-1 text-decoration-none ${
                              active
                                ? "bg-primary text-white fw-semibold"
                                : "text-secondary"
                            }`
                      }
                      aria-current={active ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span
                        className={
                          isAdmin
                            ? "arozao-panel-nav-icon"
                            : "d-inline-flex align-items-center"
                        }
                      >
                        {link.icon}
                      </span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        <Link
          href="/"
          className={
            isAdmin
              ? "arozao-panel-storefront-link"
              : "d-flex align-items-center gap-2 border-top pt-3 text-secondary text-decoration-none"
          }
        >
          <ExternalLink aria-hidden="true" />
          <span>Visit storefront</span>
        </Link>
      </aside>

      <div
        className={
          isAdmin
            ? "arozao-panel-workspace"
            : "flex-grow-1 min-vh-100 overflow-x-hidden"
        }
      >
        <header
          className={
            isAdmin
              ? "arozao-panel-topbar navbar"
              : "sticky-top d-flex align-items-center justify-content-between gap-2 gap-lg-3 bg-white border-bottom px-3 px-lg-4 py-3"
          }
        >
          <div className={isAdmin ? "arozao-panel-topbar-start" : "d-flex align-items-center gap-2"}>
            <button
              type="button"
              className={
                isAdmin
                  ? "arozao-panel-menu-toggle"
                  : "btn btn-outline-secondary btn-sm d-lg-none"
              }
              aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {sidebarOpen ? <X /> : <Menu />}
            </button>
            <div className={isAdmin ? "arozao-panel-context" : "d-flex flex-column"}>
              <strong>{title}</strong>
              {contextLabel && (
                <span
                  className={
                    isAdmin ? "" : "d-none d-lg-inline small text-secondary"
                  }
                >
                  {contextLabel}
                </span>
              )}
            </div>
          </div>

          <form
            className={
              isAdmin
                ? "arozao-panel-search form-outline"
                : "d-flex align-items-center gap-2 flex-grow-1 mx-lg-4"
            }
            role="search"
            onSubmit={handleSearch}
          >
            <Search aria-hidden="true" />
            <input
              type="search"
              className="form-control"
              aria-label={`Search ${isAdmin ? "marketplace products" : "your products"}`}
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {isAdmin && <kbd>Enter</kbd>}
          </form>

          <div
            className={
              isAdmin
                ? "arozao-panel-topbar-actions"
                : "d-flex align-items-center gap-2"
            }
          >
            <Link
              href={notificationHref}
              className={
                isAdmin
                  ? "arozao-panel-icon-button"
                  : "btn btn-outline-secondary btn-sm"
              }
              aria-label={isAdmin ? "View audit log" : "View orders"}
              title={isAdmin ? "Audit log" : "Orders"}
            >
              <Bell aria-hidden="true" />
            </Link>
            <div className={isAdmin ? "arozao-panel-profile" : "position-relative"}>
              <button
                type="button"
                className={
                  isAdmin
                    ? "arozao-panel-profile-trigger"
                    : "btn btn-light btn-sm d-flex align-items-center gap-2"
                }
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span
                  className={
                    isAdmin
                      ? "arozao-panel-avatar"
                      : "rounded-circle bg-primary-subtle text-primary fw-bold px-2 py-1"
                  }
                >
                  {(panelUser?.name || (isAdmin ? "A" : "S"))
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <span className={isAdmin ? "arozao-panel-profile-copy" : "d-none d-md-flex flex-column text-start"}>
                  <strong>{panelUser?.name || (isAdmin ? "Administrator" : "Seller")}</strong>
                  <small>{panelUser?.email || title}</small>
                </span>
                <ChevronDown aria-hidden="true" />
              </button>
              {profileOpen && (
                <div
                  className={
                    isAdmin
                      ? "arozao-panel-profile-menu"
                      : "position-absolute top-100 end-0 bg-white border rounded-3 shadow p-2 z-3"
                  }
                >
                  <Link
                    href="/"
                    className={
                      isAdmin
                        ? ""
                        : "d-flex align-items-center gap-2 text-decoration-none text-dark p-2"
                    }
                    onClick={() => setProfileOpen(false)}
                  >
                    <ExternalLink aria-hidden="true" />
                    Visit storefront
                  </Link>
                  <button
                    type="button"
                    className={
                      isAdmin
                        ? ""
                        : "d-flex align-items-center gap-2 w-100 border-0 bg-white text-danger p-2"
                    }
                    onClick={() => void handleLogout()}
                  >
                    <LogOut aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={isAdmin ? "arozao-panel-main" : "container-fluid p-3 p-lg-4"}>
          {children}
        </div>
      </div>
    </div>
  );
}
