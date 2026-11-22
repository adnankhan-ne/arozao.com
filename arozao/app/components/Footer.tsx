"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const columns = [
  {
    title: "Get to Know Us",
    links: [
      ["About Us", "/about"],
      ["Careers", "/careers"],
      ["Press Releases", "/press"],
      ["Arozao Science", "/science"],
    ],
  },
  {
    title: "Make Money with Us",
    links: [
      ["Sell on Arozao", "/sell-on-arozao"],
      ["Seller Center Login", "/seller/login"],
      ["Track Seller Application", "/sell-on-arozao/application-status"],
      ["Become an Affiliate", "/affiliate"],
    ],
  },
  {
    title: "Payment Products",
    links: [
      ["Arozao Business Card", "/business-card"],
      ["Shop with Points", "/points"],
      ["Reload Your Balance", "/balance"],
      ["Currency Converter", "/currency-converter"],
    ],
  },
  {
    title: "Let Us Help You",
    links: [
      ["Your Account", "/account"],
      ["Your Orders", "/orders"],
      ["Shipping Rates", "/shipping-rates"],
      ["Returns & Replacements", "/returns"],
    ],
  },
] as const;

export function Footer() {
  const pathname = usePathname();

  if (
    pathname?.startsWith("/sell-on-arozao/register") ||
    pathname?.startsWith("/sell-on-arozao/application-status") ||
    pathname?.startsWith("/seller") ||
    pathname?.startsWith("/admin")
  ) {
    return (
      <footer className="onboard-quiet-footer" aria-label="Arozao Seller Center Footer">
        <div className="onboard-quiet-footer-inner">
          <div className="onboard-quiet-brand">
            <span className="quiet-logo">arozao</span>
            <span className="quiet-tag">Seller Center</span>
          </div>
          <div className="onboard-quiet-links">
            <Link href="/sell-on-arozao">Seller Overview</Link>
            <span aria-hidden="true">·</span>
            <Link href="/sell-on-arozao/register">Register Store</Link>
            <span aria-hidden="true">·</span>
            <Link href="/sell-on-arozao/application-status">Track Application</Link>
            <span aria-hidden="true">·</span>
            <a href="tel:+8809612276926">Merchant Hotline: 09612-276926</a>
            <span aria-hidden="true">·</span>
            <a href="mailto:seller@arozao.com">seller@arozao.com</a>
          </div>
          <p className="onboard-quiet-copy">
            © 2026 AROZAO Technologies Ltd. Bangladesh · All Rights Reserved. Merchant terms, commission schedules, and data protection apply.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="site-footer" aria-label="Arozao footer">
      <button className="footer-back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        Back to top
      </button>
      <div className="footer-grid">
        {columns.map((column) => (
          <section key={column.title} aria-labelledby={`footer-${column.title}`}>
            <h2 id={`footer-${column.title}`}>{column.title}</h2>
            <nav aria-label={column.title}>
              {column.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
            </nav>
          </section>
        ))}
      </div>
      <div className="footer-brand-area">
        <Link className="footer-brand" href="/" aria-label="Arozao home">AROZAO</Link>
        <div className="footer-preferences" aria-label="Regional preferences">
          <button type="button">English</button>
          <button type="button">BDT - BDT TAKA</button>
          <button type="button">Bangladesh</button>
        </div>
        <div className="footer-bottom">© 2024–2026, Arozao.com</div>
      </div>
    </footer>
  );
}
