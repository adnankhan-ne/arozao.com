import Link from "next/link";
import { notFound } from "next/navigation";

interface PageInfo {
  title: string;
  intro: string;
  badge?: string;
  highlights?: { title: string; desc: string }[];
  content?: string;
}

const pages: Record<string, PageInfo> = {
  about: {
    title: "About Arozao",
    badge: "Our Story",
    intro: "We make it easier to find dependable, delightful everyday products across Bangladesh.",
    highlights: [
      { title: "Direct Sourcing", desc: "Curated electronics, home essentials, and fashion directly from trusted manufacturers." },
      { title: "Nationwide Express", desc: "Rapid 2-4 day door-to-door delivery covering all 64 districts in Bangladesh." },
      { title: "Customer-First Guarantee", desc: "Cash on delivery, 7-day hassle-free replacements, and dedicated customer support." },
    ],
  },
  careers: {
    title: "Careers at Arozao",
    badge: "Join Our Team",
    intro: "Build the future of digital retail and customer-first ecommerce in Bangladesh.",
    highlights: [
      { title: "Engineering & Product", desc: "Craft seamless, blazing-fast web and mobile shopping experiences." },
      { title: "Supply Chain & Operations", desc: "Optimize nationwide logistics, warehousing, and express fulfillment." },
      { title: "Customer Success", desc: "Deliver world-class care and delight our growing community of shoppers." },
    ],
  },
  press: {
    title: "Press & Media Releases",
    badge: "Newsroom",
    intro: "Official announcements, partnerships, and brand milestones from Arozao.",
    highlights: [
      { title: "Nationwide Expansion", desc: "Arozao introduces free delivery on orders over ৳1,500 across all 8 divisions." },
      { title: "Authentic Quality Initiative", desc: "100% genuine inspection program instituted across all catalog categories." },
    ],
  },
  science: {
    title: "Arozao Innovation & Research",
    badge: "Technology",
    intro: "How we harness modern web engineering and smart logistics to elevate your shopping experience.",
    highlights: [
      { title: "Smart Demand Matching", desc: "Intelligent forecasting ensures popular essentials stay in stock." },
      { title: "Real-Time Route Optimization", desc: "Minimizing transit times and carbon footprint for door-to-door dispatch." },
    ],
  },
  "brand-protection": {
    title: "Protect & Build Your Brand",
    badge: "Brand Registry",
    intro: "Dedicated intellectual property protection and counterfeit deterrence for authentic brands.",
    highlights: [
      { title: "Automated Protection", desc: "Real-time verification flags uncertified product listings." },
      { title: "Dedicated Reporting", desc: "Rapid review pipeline for trademark holders and authorized distributors." },
    ],
  },
  "global-selling": {
    title: "Arozao Global Selling",
    badge: "Cross-Border Trade",
    intro: "Connect local artisans and manufacturers with international demand across the globe.",
    highlights: [
      { title: "Export Logistics", desc: "Simplified customs clearance and international air express shipping." },
      { title: "Multi-Currency Settlement", desc: "Transact globally and receive localized payouts securely." },
    ],
  },
  affiliate: {
    title: "Become an Arozao Affiliate",
    badge: "Partner & Earn",
    intro: "Earn generous commissions by recommending quality products to your audience.",
    highlights: [
      { title: "Up to 10% Commission", desc: "Earn competitive referral rates on eligible purchases." },
      { title: "30-Day Cookie Window", desc: "Get credited for returning shoppers through your personalized links." },
      { title: "Real-Time Analytics", desc: "Monitor traffic, clicks, conversions, and earnings via your dashboard." },
    ],
  },
  "business-card": {
    title: "Arozao Business Purchasing",
    badge: "Corporate & B2B",
    intro: "Bulk purchasing, office supplies, and corporate procurement made effortless.",
    highlights: [
      { title: "Volume Discounts", desc: "Exclusive tier pricing for bulk orders and recurrent company procurement." },
      { title: "GST & Tax Invoices", desc: "Automated VAT receipts and tax documentation for enterprise bookkeeping." },
    ],
  },
  points: {
    title: "Shop with Points & Rewards",
    badge: "Loyalty Program",
    intro: "Earn Arozao reward points on every order and redeem them for instant discounts at checkout.",
    highlights: [
      { title: "1 Point per ৳100", desc: "Accumulate points automatically with every completed parcel order." },
      { title: "Instant Redemption", desc: "Apply points during checkout for direct bill deductions." },
    ],
  },
  balance: {
    title: "Reload Your Balance",
    badge: "Payment Methods",
    intro: "Top up your Arozao account balance for one-click checkout across all categories.",
    highlights: [
      { title: "Instant Top-Up", desc: "Supports bKash, Nagad, Rocket, and Visa/Mastercard payments." },
      { title: "Zero Transaction Fees", desc: "Every taka reloaded is available in full for purchases." },
    ],
  },
  "currency-converter": {
    title: "Currency Converter",
    badge: "Pricing & Rates",
    intro: "Understand exchange values and local BDT pricing for imported merchandise.",
    highlights: [
      { title: "Real-Time Rates", desc: "Live foreign currency reference updated daily." },
      { title: "Transparent Checkout", desc: "All final payments are settled strictly in Bangladeshi Taka (৳)." },
    ],
  },
  "shipping-rates": {
    title: "Shipping & Delivery Rates",
    badge: "Nationwide Coverage",
    intro: "Dependable, insured delivery across all 64 districts in Bangladesh.",
    highlights: [
      { title: "Standard Delivery", desc: "৳60 standard rate across Bangladesh; completely FREE for orders ৳1,500+." },
      { title: "Express Dispatch", desc: "Orders placed before 2:00 PM dispatch same day from our primary warehouse." },
    ],
  },
  returns: {
    title: "Returns & Replacements",
    badge: "Customer Protection",
    intro: "Hassle-free 7-day replacement guarantee on eligible defective or damaged merchandise.",
    highlights: [
      { title: "7-Day Replacement", desc: "Contact support within 7 days of package arrival for verified exchange." },
      { title: "Free Return Courier", desc: "Arozao handles return collection for confirmed defective items." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    badge: "Data Protection",
    intro: "We respect your privacy and protect your personal information with industry standards.",
    highlights: [
      { title: "Encrypted Storage", desc: "Account credentials and order records are stored with robust encryption." },
      { title: "No Third-Party Reselling", desc: "We never sell your contact info or browsing data to external advertisers." },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    badge: "Usage Guidelines",
    intro: "The standard terms governing orders, deliveries, and services provided by Arozao.",
    highlights: [
      { title: "Order Acceptance", desc: "Orders are verified upon placement and confirmed via SMS/email notification." },
      { title: "Pricing Accuracy", desc: "All prices are listed accurately in BDT; promotional discounts apply during valid dates." },
    ],
  },
  "seller-agreement": {
    title: "Arozao Seller Agreement",
    badge: "Merchant Terms",
    intro: "Operational standards, terms, and codes of conduct for verified sellers on Arozao.",
    highlights: [
      { title: "Authenticity Commitment", desc: "Merchants certify all listed products are genuine and accurately described." },
      { title: "Timely Dispatch", desc: "Sellers agree to prepare orders within 24-48 hours of notification." },
      { title: "Payout Policies", desc: "Settlements are processed transparently upon order delivery completion." },
    ],
  },
  help: {
    title: "Customer Help & Support",
    badge: "Support Center",
    intro: "Find answers, track parcels, and contact our 24/7 dedicated customer care team.",
    highlights: [
      { title: "Hotline Support", desc: "Dial 09612-276926 for instant telephone assistance." },
      { title: "Email Care", desc: "Reach us anytime at support@arozao.com." },
    ],
  },
};

export default function StaticInfoPage({ params }: { params: { slug: string } }) {
  if (!params.slug || params.slug.startsWith("_") || params.slug.startsWith(".")) {
    notFound();
  }

  const key = params.slug.replace(/\.html$/, "");
  const page = pages[key];

  if (!page) {
    notFound();
  }

  return (
    <main className="site-content">
      <div className="page-intro">
        <span className="eyebrow">{page.badge || "Arozao"}</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        {page.highlights && (
          <div className="content-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {page.highlights.map((h, i) => (
              <div className="content-card" key={i}>
                <h3 style={{ fontSize: 18, marginBottom: 8, color: "var(--color-primary)" }}>{h.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{h.desc}</p>
              </div>
            ))}
          </div>
        )}

        <section className="content-card" style={{ textAlign: "center", padding: "36px 24px" }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Ready to explore our store?</h2>
          <p style={{ maxWidth: 540, margin: "0 auto 24px", color: "var(--color-text-secondary)" }}>
            Browse top deals, trending electronics, quality kitchenware, and fashion essentials with nationwide express delivery.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/products" className="button button-primary">
              Browse All Products
            </Link>
            <Link href="/orders" className="button button-secondary">
              Track an Order
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
