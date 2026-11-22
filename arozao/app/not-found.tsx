import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-content" style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#D97706",
            display: "block",
            marginBottom: "12px",
          }}
        >
          404 · Page Not Found
        </span>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            color: "var(--color-text-primary, #1C1A2B)",
            marginBottom: "16px",
            lineHeight: 1.2,
          }}
        >
          Looking for something on Arozao?
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "var(--color-text-secondary, #54506B)",
            lineHeight: 1.6,
            marginBottom: "32px",
          }}
        >
          We couldn&apos;t find the page you were looking for. The link may be broken, or the page may have been moved.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/"
            className="button button-primary"
            style={{
              padding: "12px 24px",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            Return to Homepage
          </Link>
          <Link
            href="/products"
            className="button button-secondary"
            style={{
              padding: "12px 24px",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Browse Products
          </Link>
          <Link
            href="/sell-on-arozao"
            className="button button-secondary"
            style={{
              padding: "12px 24px",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Sell on Arozao
          </Link>
        </div>
      </div>
    </main>
  );
}
