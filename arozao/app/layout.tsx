import "./globals.css";
import "./seller-onboarding.css";
import "./sell-landing.css";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { ToastProvider } from "@/components/ToastNotification";
import { NotificationProvider } from "@/components/NotificationProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import type { Viewport } from "next";
import { Inter, Sora, Hind_Siliguri } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const bangla = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bangla",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FF991C",
};

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.APP_URL ||
      "https://arozao.com"
  ),
  title: {
    default: "Arozao — Bangladesh Online Shopping & Multi-Vendor Marketplace",
    template: "%s | Arozao",
  },
  description:
    "Everyday essentials & verified electronics marketplace in Bangladesh with express doorstep delivery, Cash on Delivery, and bKash/Nagad checkout.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Arozao",
    title: "Arozao — Bangladesh Online Shopping & Multi-Vendor Marketplace",
    description:
      "Everyday essentials & verified electronics marketplace in Bangladesh with express doorstep delivery, Cash on Delivery, and bKash/Nagad checkout.",
    url: "https://arozao.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arozao — Bangladesh Online Shopping & Multi-Vendor Marketplace",
    description:
      "Everyday essentials & verified electronics marketplace in Bangladesh with express doorstep delivery, Cash on Delivery, and bKash/Nagad checkout.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Arozao",
  url: "https://arozao.com",
  description:
    "Bangladesh-focused multi-vendor e-commerce marketplace offering electronics, gadgets, fashion, and home essentials.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Dhaka",
    addressCountry: "BD",
  },
};

function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} ${bangla.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(organizationJsonLd),
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <NotificationProvider>
                <Header />
                <div id="main-content" tabIndex={-1}>
                  {children}
                </div>
                <Footer />
                <MobileBottomNav />
              </NotificationProvider>
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
