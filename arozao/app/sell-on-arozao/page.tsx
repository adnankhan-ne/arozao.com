"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const QUICK_START_OPTIONS = [
  {
    id: "new",
    icon: "fa-seedling",
    title: "I’m New to Online Selling",
    description: "I have products but I have never sold online before.",
    buttonText: "Start as a New Seller",
    href: "/sell-on-arozao/register?type=new",
    guide: "We provide guided onboarding, step-by-step catalog listing assistance, and clear fulfillment instructions to help you make your first online sale.",
  },
  {
    id: "social",
    icon: "fa-share-nodes",
    title: "I Already Sell Online",
    description: "I currently sell through Facebook, Instagram, WhatsApp, or another platform.",
    buttonText: "Bring My Business to Arozao",
    href: "/sell-on-arozao/register?type=social",
    guide: "Transition your social media followers to a structured online storefront with automated order tracking, organized inventory, and simplified payment handling.",
  },
  {
    id: "established",
    icon: "fa-building-circle-check",
    title: "I Run an Established Business",
    description: "I already have an established business and want to reach more online customers.",
    buttonText: "Expand to Arozao",
    href: "/sell-on-arozao/register?type=established",
    guide: "Accelerate your reach across all 64 districts in Bangladesh with bulk product uploads, merchant compliance tools, and multi-user dashboard controls.",
  },
];

const BENEFITS = [
  {
    icon: "fa-users-viewfinder",
    title: "Reach More Customers",
    description: "Put your products in front of customers across Bangladesh through the Arozao marketplace.",
  },
  {
    icon: "fa-list-check",
    title: "Easy Product Listing",
    description: "Add product images, descriptions, prices, stock, and other information through a simple seller experience.",
  },
  {
    icon: "fa-boxes-stacked",
    title: "Manage Your Orders",
    description: "Keep track of new, pending, completed, and other order activity from one place.",
  },
  {
    icon: "fa-chart-line-up",
    title: "Built for Growing Businesses",
    description: "Use seller tools designed to help you manage your products, orders, store, and business activity.",
  },
];

const WHY_POINTS = [
  {
    num: "01",
    title: "Reach Customers Across Bangladesh",
    desc: "Give your products visibility through a Bangladesh-focused marketplace.",
  },
  {
    num: "02",
    title: "Build Your Online Store",
    desc: "Present your products through a professional online storefront.",
  },
  {
    num: "03",
    title: "Manage Products Easily",
    desc: "Control product information, pricing, stock, and listings from your seller account.",
  },
  {
    num: "04",
    title: "Manage Orders in One Place",
    desc: "Track your order activity through your seller dashboard.",
  },
  {
    num: "05",
    title: "Designed for Bangladeshi Sellers",
    desc: "Built around the needs of businesses selling to customers in Bangladesh.",
  },
  {
    num: "06",
    title: "Seller Support",
    desc: "Access seller resources and support throughout your marketplace journey.",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    icon: "fa-user-plus",
    title: "Create Your Seller Account",
    desc: "Create your Arozao seller account and begin your onboarding process.",
  },
  {
    step: "02",
    icon: "fa-id-card-clip",
    title: "Tell Us About Your Business",
    desc: "Provide the information needed to set up your seller profile.",
  },
  {
    step: "03",
    icon: "fa-shield-check",
    title: "Complete Verification",
    desc: "Submit the required information and documents applicable to your seller type.",
  },
  {
    step: "04",
    icon: "fa-folder-plus",
    title: "List Your Products",
    desc: "Add your products, images, descriptions, pricing, and inventory.",
  },
  {
    step: "05",
    icon: "fa-shop",
    title: "Start Selling",
    desc: "Receive orders and manage your business through your seller dashboard.",
  },
];

const CATEGORIES = [
  { name: "Electronics", icon: "fa-laptop", desc: "Devices, power, & audio" },
  { name: "Phone Accessories", icon: "fa-mobile-screen-button", desc: "Cases, chargers, & cables" },
  { name: "Computer Accessories", icon: "fa-keyboard", desc: "Mice, hubs, & peripherals" },
  { name: "Gadgets", icon: "fa-microchip", desc: "Smart wearables & lifestyle tech" },
  { name: "Home Decor", icon: "fa-couch", desc: "Lighting, art, & accents" },
  { name: "Kitchen", icon: "fa-blender", desc: "Cookware, tools, & appliances" },
  { name: "Lifestyle", icon: "fa-mug-hot", desc: "Daily living & personal goods" },
  { name: "Showpieces", icon: "fa-gem", desc: "Decorative items & ceramics" },
  { name: "Girls Fashion", icon: "fa-person-dress", desc: "Apparel, shawls, & bags" },
  { name: "Boys Fashion", icon: "fa-shirt", desc: "Jerseys, tees, & accessories" },
  { name: "Beauty & Personal Care", icon: "fa-pump-soap", desc: "Grooming & personal care" },
  { name: "Daily Essentials", icon: "fa-basket-shopping", desc: "Everyday household essentials" },
];

const SELLER_TOOLS_FEATURES = [
  {
    title: "Product Management",
    desc: "Add, edit, and organize product catalogs with photo uploads and price controls.",
  },
  {
    title: "Order Management",
    desc: "Review new purchases, prepare shipments, and track packaging status.",
  },
  {
    title: "Inventory Tracking",
    desc: "Monitor on-hand quantities and receive alerts before items run out of stock.",
  },
  {
    title: "Sales Overview",
    desc: "Track daily sales, order velocity, and top-performing merchandise.",
  },
  {
    title: "Store Management",
    desc: "Customize your shop profile, store name, and operational contact details.",
  },
  {
    title: "Payout Information",
    desc: "Review cleared seller earnings and track historical transaction summaries.",
  },
  {
    title: "Order Details",
    desc: "Inspect customer delivery locations and track parcel handoff stages.",
  },
  {
    title: "Seller Account Settings",
    desc: "Configure account security, password options, and login credentials.",
  },
];

const ORDER_JOURNEY_STEPS = [
  { num: "Step 1", icon: "fa-bag-shopping", title: "Customer Places Order" },
  { num: "Step 2", icon: "fa-bell", title: "Seller Receives Notification" },
  { num: "Step 3", icon: "fa-box-open", title: "Seller Prepares Product" },
  { num: "Step 4", icon: "fa-truck-fast", title: "Product Handed Over for Delivery" },
  { num: "Step 5", icon: "fa-house-circle-check", title: "Customer Receives Product" },
  { num: "Step 6", icon: "fa-circle-check", title: "Order Is Completed" },
];

const PAYOUT_STEPS = [
  {
    num: "01",
    icon: "fa-receipt",
    title: "Order Completed",
    desc: "Customer receives their package and the delivery is confirmed.",
  },
  {
    num: "02",
    icon: "fa-sliders",
    title: "Payment Processing",
    desc: "The marketplace system processes the transaction records.",
  },
  {
    num: "03",
    icon: "fa-wallet",
    title: "Eligible Seller Balance",
    desc: "Settled proceeds reflect in your merchant dashboard balance.",
  },
  {
    num: "04",
    icon: "fa-building-columns",
    title: "Seller Payout",
    desc: "Available balances are transferred based on your account records.",
  },
];

const SELLER_REQUIREMENTS_LIST = [
  "Full Name",
  "Mobile Number",
  "Email Address",
  "Current Address",
  "Business Information",
  "Product Information",
  "Product Images",
  "Product Pricing",
  "Inventory Information",
  "Payout Information",
  "Applicable Verification Documents",
];

const SELLER_JOURNEY_9 = [
  { num: "01", icon: "fa-compass", title: "Discover Arozao", desc: "Explore the marketplace benefits designed for businesses across Bangladesh." },
  { num: "02", icon: "fa-user-check", title: "Create Account", desc: "Sign up in minutes with your mobile number, email, and password." },
  { num: "03", icon: "fa-file-shield", title: "Complete Verification", desc: "Submit applicable identification details for compliance review." },
  { num: "04", icon: "fa-store", title: "Set Up Store", desc: "Enter your store name, pickup address, and merchant bio." },
  { num: "05", icon: "fa-tags", title: "Add Products", desc: "Upload product photos, set BDT prices, descriptions, and stock counts." },
  { num: "06", icon: "fa-bell-ring", title: "Receive Orders", desc: "Get real-time alerts whenever customers purchase items from your store." },
  { num: "07", icon: "fa-box-archive", title: "Fulfill Orders", desc: "Package items securely and hand them over for delivery." },
  { num: "08", icon: "fa-money-bill-transfer", title: "Receive Payout", desc: "Track cleared balances and transfer eligible funds to your account." },
  { num: "09", icon: "fa-arrow-trend-up", title: "Grow Your Business", desc: "Analyze sales reports, add new product lines, and reach more shoppers." },
];

const FAQS = [
  {
    q: "Who can become an Arozao seller?",
    a: "Anyone in Bangladesh with quality products to sell can apply—including individual entrepreneurs, small boutique owners, social commerce sellers on Facebook or Instagram, craftsmen, wholesalers, and registered commercial enterprises.",
  },
  {
    q: "What do I need to create a seller account?",
    a: "To begin, you need a valid Bangladeshi mobile number, an active email address, basic personal identification (such as your NID), your pickup address, and your store details.",
  },
  {
    q: "Can I sell on Arozao if I am a small or home-based business?",
    a: "Yes. Arozao is designed specifically to help small, local, and home-based businesses in Bangladesh establish a credible online storefront and reach customers nationwide without heavy upfront overhead.",
  },
  {
    q: "What types of products can I sell?",
    a: "You can sell electronics, phone and computer accessories, smart gadgets, home decor, kitchenware, lifestyle goods, showpieces, clothing, fashion items, beauty essentials, and everyday consumer products, subject to marketplace guidelines.",
  },
  {
    q: "How do I add products to my store?",
    a: "Once registered, log into your Seller Center dashboard where you can easily upload photos, write titles and descriptions, set prices in Bangladeshi Taka (BDT), and manage inventory numbers.",
  },
  {
    q: "How will I receive orders?",
    a: "Whenever a customer places an order for one of your items, you will receive real-time notifications in your Seller Center dashboard and via alert messages so you can prepare the package immediately.",
  },
  {
    q: "How does delivery work?",
    a: "Available fulfillment options will be shown based on your seller account and eligible orders. Depending on your setup, you can arrange customer delivery directly or hand packages to supported delivery couriers.",
  },
  {
    q: "How do seller payouts work?",
    a: "Once customer orders are completed and cleared, eligible balances are reflected in your Seller Dashboard and transferred to your registered account according to the marketplace settlement process.",
  },
  {
    q: "What happens if a customer returns an order?",
    a: "Orders returned in accordance with Arozao's return window are tracked in your Seller Dashboard under Returns. You are notified of the return progress and package status.",
  },
  {
    q: "How does seller verification work?",
    a: "During onboarding, our verification team reviews your submitted contact information, address, and applicable documents to maintain trust and safety across the marketplace.",
  },
  {
    q: "What can I manage from the Seller Dashboard?",
    a: "The Seller Dashboard is your central control room for adding products, updating prices and stock, reviewing new and historical orders, tracking delivery stages, and viewing payout balances.",
  },
  {
    q: "Where can I get seller support?",
    a: "Sellers can access dedicated merchant resources, seller guidance documentation, and support contacts through the Seller Help Center and directly from their Seller Center portal.",
  },
];

export default function SellOnArozaoPage() {
  const [selectedQuickStart, setSelectedQuickStart] = useState("new");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="sell-landing-root">
      {/* --------------------------------------------------------------------
          LANDING PAGE DEDICATED SUB-HEADER
          -------------------------------------------------------------------- */}
      <nav className="sell-landing-nav" aria-label="Seller Program Navigation">
        <div className="sell-landing-nav-inner">
          <Link href="/sell-on-arozao" className="sell-landing-brand">
            <span className="sell-brand-title">arozao</span>
            <span className="sell-brand-tag">Seller Program</span>
          </Link>

          <div className="sell-landing-links">
            <a href="#quick-start">Quick Start</a>
            <a href="#benefits">Benefits</a>
            <a href="#why-arozao">Why Arozao</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#categories">Categories</a>
            <a href="#tools">Seller Tools</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="sell-landing-actions">
            <Link href="/sell-on-arozao/application-status" className="sell-nav-secondary">
              Track Application
            </Link>
            <Link href="/seller/login" className="sell-nav-secondary">
              Seller Log In
            </Link>
            <Link href="/sell-on-arozao/register" className="sell-nav-primary-btn">
              <span>Start Selling</span>
              <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </Link>
          </div>
        </div>
      </nav>

      {/* --------------------------------------------------------------------
          SECTION 01 — HERO
          -------------------------------------------------------------------- */}
      <section className="sell-section sell-hero-section" id="overview">
        <div className="sell-container">
          <div className="sell-hero-grid">
            {/* Left Column: Headlines & Action */}
            <div className="sell-hero-content">
              <span className="sell-kicker">Marketplace for Bangladesh</span>
              <h1 className="sell-hero-h1">Grow Your Business with Arozao</h1>
              <p className="sell-hero-lead">
                Reach customers across Bangladesh and build your online business with a simple, modern marketplace experience.
              </p>

              <div className="sell-hero-ctas">
                <Link href="/sell-on-arozao/register" className="sell-btn-primary sell-btn-accent">
                  <span>Start Selling on Arozao</span>
                  <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </Link>
                <a href="#how-it-works" className="sell-btn-secondary">
                  <span>See How It Works</span>
                  <i className="fa-solid fa-angle-down" aria-hidden="true"></i>
                </a>
              </div>

              <div className="sell-hero-trust-bar">
                <span>Bangladeshi sellers</span>
                <span className="sell-trust-sep" aria-hidden="true">·</span>
                <span>Simple product listing</span>
                <span className="sell-trust-sep" aria-hidden="true">·</span>
                <span>Direct payouts</span>
                <span className="sell-trust-sep" aria-hidden="true">·</span>
                <span>Order management tools</span>
              </div>
            </div>

            {/* Right Column: Premium Visual & Realistic Floating Dashboard */}
            <div className="sell-hero-visual">
              <div className="sell-hero-image-frame">
                <Image
                  src="/images/bangladeshi_seller_hero_1790659609273.jpg"
                  alt="Bangladeshi small business owner preparing product packaging in workshop for online orders"
                  width={640}
                  height={480}
                  priority
                  sizes="(max-width: 768px) 100vw, 600px"
                  referrerPolicy="no-referrer"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>

              {/* Floating Realistic Arozao Seller Dashboard Widget */}
              <div className="sell-hero-float-card" aria-label="Demo Arozao Seller Dashboard">
                <div className="float-card-header">
                  <span className="float-store-name">
                    <i className="fa-solid fa-store" style={{ color: "#552D00" }}></i>
                    Dhaka Gadget Hub
                  </span>
                  <span className="float-badge">Verified Seller</span>
                </div>

                <div className="float-metrics-grid">
                  <div className="float-metric-item">
                    <small>Total Sales</small>
                    <strong>৳148,250</strong>
                  </div>
                  <div className="float-metric-item">
                    <small>Orders</small>
                    <strong>54</strong>
                  </div>
                  <div className="float-metric-item">
                    <small>Products</small>
                    <strong>18</strong>
                  </div>
                  <div className="float-metric-item">
                    <small>Pending</small>
                    <strong style={{ color: "#d97706" }}>4 Orders</strong>
                  </div>
                </div>

                <div className="float-status-ticker">
                  <span className="status-dot"></span>
                  <span>Order #AZ-84920 · Ready for Pickup</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 02 — QUICK START / SELLER DISCOVERY
          -------------------------------------------------------------------- */}
      <section className="sell-section" id="quick-start">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Onboarding Pathways</span>
            <h2 className="sell-title">Not sure where to start?</h2>
            <p className="sell-subtitle">
              Choose the path that best describes your business and begin your Arozao seller journey.
            </p>
          </div>

          <div className="sell-quickstart-grid">
            {QUICK_START_OPTIONS.map((opt) => {
              const isActive = selectedQuickStart === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`quickstart-card ${isActive ? "is-active" : ""}`}
                  onClick={() => setSelectedQuickStart(opt.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedQuickStart(opt.id);
                  }}
                  aria-pressed={isActive}
                >
                  <div>
                    <div className="quickstart-icon-wrap">
                      <i className={`fa-solid ${opt.icon}`} aria-hidden="true"></i>
                    </div>
                    <h3 className="quickstart-title">{opt.title}</h3>
                    <p className="quickstart-desc">{opt.description}</p>
                    {isActive && (
                      <div style={{ background: "#FAF8F3", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E5E1D5", fontSize: "12px", color: "#54506B", marginBottom: "20px" }}>
                        <strong>Arozao Pathway:</strong> {opt.guide}
                      </div>
                    )}
                  </div>
                  <Link href={opt.href} className="sell-btn-secondary">
                    <span>{opt.buttonText}</span>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 03 — SELLER BENEFITS
          -------------------------------------------------------------------- */}
      <section className="sell-section sell-section-alt" id="benefits">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Core Advantages</span>
            <h2 className="sell-title">Everything You Need to Start Selling Online</h2>
            <p className="sell-subtitle">
              Designed to help you reach customers, showcase products, and handle store orders smoothly.
            </p>
          </div>

          <div className="sell-benefits-grid">
            {BENEFITS.map((b) => (
              <div key={b.title} className="benefit-card">
                <div className="benefit-icon-wrap">
                  <i className={`fa-solid ${b.icon}`} aria-hidden="true"></i>
                </div>
                <h3 className="benefit-title">{b.title}</h3>
                <p className="benefit-desc">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 04 — WHY SELL ON AROZAO
          -------------------------------------------------------------------- */}
      <section className="sell-section" id="why-arozao">
        <div className="sell-container">
          <div className="sell-why-grid">
            {/* Left: Stacked Benefits */}
            <div>
              <div className="sell-section-header text-left" style={{ marginBottom: "32px" }}>
                <span className="sell-kicker">Built For Bangladesh</span>
                <h2 className="sell-title">Why Sell on Arozao?</h2>
                <p className="sell-subtitle">
                  We empower local business owners with a marketplace platform tailored to Bangladeshi trade.
                </p>
              </div>

              <div className="why-items-list">
                {WHY_POINTS.map((pt) => (
                  <div key={pt.num} className="why-item">
                    <span className="why-num">{pt.num}</span>
                    <div className="why-item-content">
                      <h3>{pt.title}</h3>
                      <p>{pt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Verified Seller Story Component */}
            <div className="seller-story-placeholder">
              <span className="story-label">Verified Seller Story</span>
              <div className="story-placeholder-icon">
                <i className="fa-solid fa-quote-left" aria-hidden="true"></i>
              </div>
              <h3 className="story-placeholder-title">Real Seller Stories Coming Soon</h3>
              <p className="story-placeholder-body">
                We are actively onboarding creators, boutique owners, electronics distributors, and craftsmen across Dhaka, Chattogram, Sylhet, and other districts in Bangladesh.
              </p>
              <p className="story-placeholder-body">
                As sellers establish their shops and fulfill orders, this space will spotlight their entrepreneurial milestones, growth journeys, and store showcases.
              </p>

              <div className="story-community-box">
                <strong>Be part of the founding community</strong>
                <p>Register your store today and let your entrepreneurial story be the next one featured on Arozao.</p>
              </div>

              <Link href="/sell-on-arozao/register" className="sell-btn-primary" style={{ width: "100%" }}>
                <span>Apply to Sell on Arozao</span>
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 05 — HOW IT WORKS
          -------------------------------------------------------------------- */}
      <section className="sell-section sell-section-alt" id="how-it-works">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Simple 5-Step Process</span>
            <h2 className="sell-title">How Selling on Arozao Works</h2>
            <p className="sell-subtitle">
              Follow our clear onboarding steps to establish your online storefront and start accepting orders.
            </p>
          </div>

          <div className="sell-timeline-horizontal">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div key={s.step} className="timeline-step">
                <div className="step-marker">
                  <span className="step-marker-num">Step {s.step}</span>
                  <i className={`fa-solid ${s.icon} step-marker-icon`} aria-hidden="true"></i>
                </div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <Link href="/sell-on-arozao/register" className="sell-btn-primary sell-btn-accent">
              <span>Begin Step 1: Create Account</span>
              <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 06 — WHAT YOU CAN SELL
          -------------------------------------------------------------------- */}
      <section className="sell-section" id="categories">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Marketplace Catalog</span>
            <h2 className="sell-title">What Can You Sell on Arozao?</h2>
            <p className="sell-subtitle">
              Bring your products to customers looking for everyday products, lifestyle items, and more.
            </p>
          </div>

          <div className="sell-categories-grid">
            {CATEGORIES.map((cat) => (
              <div key={cat.name} className="sell-category-card">
                <div className="category-icon-box">
                  <i className={`fa-solid ${cat.icon}`} aria-hidden="true"></i>
                </div>
                <div>
                  <h3 className="category-card-name">{cat.name}</h3>
                  <p className="category-card-sub">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="sell-category-disclaimer">
            <i className="fa-solid fa-circle-info" style={{ marginRight: 6, color: "#D97706" }}></i>
            Certain products or categories may be subject to Arozao’s applicable requirements and approval policies.
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 07 — SELLER TOOLS
          -------------------------------------------------------------------- */}
      <section className="sell-section sell-section-dark" id="tools">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Platform Capabilities</span>
            <h2 className="sell-title">Tools to Help You Run Your Business</h2>
            <p className="sell-subtitle">
              A comprehensive merchant dashboard built to streamline product listings, track order progress, and monitor store metrics.
            </p>
          </div>

          <div className="sell-tools-grid">
            {/* Left: Realistic Arozao Seller Dashboard Mockup */}
            <div className="tools-dashboard-mockup" aria-label="Arozao Seller Center Interface">
              <div className="tools-dash-topbar">
                <div className="tools-dash-title">
                  <span style={{ fontSize: "18px" }}>🏪</span>
                  <strong>Arozao Seller Center</strong>
                  <span className="dash-badge">Live Dashboard</span>
                </div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                  Store: <strong>Dhaka Electronics</strong>
                </div>
              </div>

              {/* 8 Metric Widgets */}
              <div className="tools-widgets-grid">
                <div className="tool-widget-box">
                  <small>Total Sales</small>
                  <strong style={{ color: "#FB923C" }}>৳148,250</strong>
                </div>
                <div className="tool-widget-box">
                  <small>Orders</small>
                  <strong>54</strong>
                </div>
                <div className="tool-widget-box">
                  <small>Products</small>
                  <strong>18 Active</strong>
                </div>
                <div className="tool-widget-box">
                  <small>Inventory</small>
                  <strong>342 Units</strong>
                </div>
                <div className="tool-widget-box">
                  <small>Pending Orders</small>
                  <strong style={{ color: "#FBBF24" }}>4 Parcels</strong>
                </div>
                <div className="tool-widget-box">
                  <small>Completed</small>
                  <strong style={{ color: "#34D399" }}>50 Orders</strong>
                </div>
                <div className="tool-widget-box">
                  <small>Returns</small>
                  <strong>0 Recent</strong>
                </div>
                <div className="tool-widget-box">
                  <small>Payouts</small>
                  <strong style={{ color: "#38BDF8" }}>৳38,450</strong>
                </div>
              </div>

              {/* Recent Orders Snippet */}
              <div className="tools-orders-snippet">
                <div className="tools-orders-head">
                  <span>Recent Order Activity</span>
                  <span>Fulfillment Status</span>
                </div>
                <div className="tools-orders-row">
                  <span>#AZ-9210 · Wireless Earbuds</span>
                  <span style={{ color: "#FBBF24" }}>Ready for Courier</span>
                </div>
                <div className="tools-orders-row">
                  <span>#AZ-9208 · USB Desk Fan</span>
                  <span style={{ color: "#34D399" }}>Delivered (Dhaka)</span>
                </div>
                <div className="tools-orders-row">
                  <span>#AZ-9205 · Sports Jersey</span>
                  <span style={{ color: "#34D399" }}>Delivered (Chittagong)</span>
                </div>
              </div>
            </div>

            {/* Right: Feature Blocks & CTA */}
            <div>
              <div className="tools-features-list">
                {SELLER_TOOLS_FEATURES.map((feat) => (
                  <div key={feat.title} className="tool-feature-item">
                    <h3>{feat.title}</h3>
                    <p>{feat.desc}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                <Link href="/seller/dashboard" className="sell-btn-primary sell-btn-accent">
                  <span>Explore Seller Dashboard</span>
                  <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                </Link>
                <Link href="/sell-on-arozao/register" className="sell-btn-secondary">
                  <span>Register Store</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 08 — ORDER & DELIVERY
          -------------------------------------------------------------------- */}
      <section className="sell-section" id="delivery">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Fulfillment Lifecycle</span>
            <h2 className="sell-title">What Happens When You Receive an Order?</h2>
            <p className="sell-subtitle">
              A transparent, predictable sequence keeping you informed from purchase notification to final completion.
            </p>
          </div>

          <div className="order-journey-row">
            {ORDER_JOURNEY_STEPS.map((oj) => (
              <div key={oj.num} className="journey-step-card">
                <span className="journey-step-num">{oj.num}</span>
                <i className={`fa-solid ${oj.icon} journey-icon`} aria-hidden="true"></i>
                <h3 className="journey-step-title">{oj.title}</h3>
              </div>
            ))}
          </div>

          <div className="fulfillment-options-grid">
            <div className="fulfillment-card">
              <h3>
                <i className="fa-solid fa-person-walking-luggage" style={{ color: "#552D00" }}></i>
                Seller Fulfilled
              </h3>
              <p>
                Sellers who maintain their own local delivery arrangements or point-to-point courier handoffs can directly coordinate dispatch and packaging according to their operational preferences.
              </p>
            </div>

            <div className="fulfillment-card">
              <h3>
                <i className="fa-solid fa-truck-ramp-box" style={{ color: "#552D00" }}></i>
                Supported Fulfillment
              </h3>
              <p>
                Where platform-supported courier pickup is available, sellers can schedule parcel collection directly from their designated pickup address in major hubs for delivery handoff.
              </p>
            </div>
          </div>

          <div className="sell-category-disclaimer">
            <i className="fa-solid fa-circle-info" style={{ marginRight: 6, color: "#D97706" }}></i>
            Available fulfillment options will be shown based on your seller account and eligible orders.
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 09 — SELLER PAYOUTS
          -------------------------------------------------------------------- */}
      <section className="sell-section sell-section-alt" id="payouts">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Financial Transparency</span>
            <h2 className="sell-title">How Seller Payouts Work</h2>
            <p className="sell-subtitle">
              Your available payout information will be shown through your seller account and dashboard.
            </p>
          </div>

          <div className="payout-flow-grid">
            {PAYOUT_STEPS.map((p) => (
              <div key={p.num} className="payout-flow-card">
                <div className="payout-flow-num">Stage {p.num}</div>
                <i className={`fa-solid ${p.icon} payout-flow-icon`} aria-hidden="true"></i>
                <h3 className="payout-flow-title">{p.title}</h3>
                <p className="payout-flow-desc">{p.desc}</p>
              </div>
            ))}
          </div>

          <p className="payout-compliance-note">
            Settlement schedules and payout thresholds are managed transparently within your verified merchant settings.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 10 — SELLER SUPPORT
          -------------------------------------------------------------------- */}
      <section className="sell-section" id="support">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Merchant Care</span>
            <h2 className="sell-title">You’re Not Alone</h2>
            <p className="sell-subtitle">
              Access seller resources and support throughout your journey on Arozao.
            </p>
          </div>

          <div className="support-cards-grid">
            <div className="support-card">
              <i className="fa-solid fa-circle-question support-icon" aria-hidden="true"></i>
              <h3 className="support-title">Seller Help Center</h3>
              <p className="support-desc">
                Find information and guidance for common seller questions, store setup tutorials, and listing standards.
              </p>
            </div>

            <div className="support-card">
              <i className="fa-solid fa-box-check support-icon" aria-hidden="true"></i>
              <h3 className="support-title">Order Support</h3>
              <p className="support-desc">
                Get help with seller-side order issues, parcel status verification, and customer delivery questions.
              </p>
            </div>

            <div className="support-card">
              <i className="fa-solid fa-user-shield support-icon" aria-hidden="true"></i>
              <h3 className="support-title">Account Support</h3>
              <p className="support-desc">
                Get assistance with your seller account, profile verification, address updates, and credentials.
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <a href="#faq" className="sell-btn-secondary">
              <span>Visit Seller Help Center</span>
              <i className="fa-solid fa-angle-down" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 11 — SELLER REQUIREMENTS
          -------------------------------------------------------------------- */}
      <section className="sell-section sell-section-alt" id="requirements">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Onboarding Checklist</span>
            <h2 className="sell-title">What You May Need to Get Started</h2>
            <p className="sell-subtitle">
              Keep these essential details handy to make your registration smooth and efficient.
            </p>
          </div>

          <div className="requirements-checklist-grid">
            {SELLER_REQUIREMENTS_LIST.map((item) => (
              <div key={item} className="req-item">
                <span className="req-check" aria-hidden="true">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="req-note">
            Requirements may vary depending on your seller type, business information, products, and applicable verification requirements.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 12 — SELLER JOURNEY
          -------------------------------------------------------------------- */}
      <section className="sell-section" id="journey">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Lifecycle Roadmap</span>
            <h2 className="sell-title">Your Journey from Seller to Growing Business</h2>
            <p className="sell-subtitle">
              From discovering Arozao to building an established merchant brand across Bangladesh.
            </p>
          </div>

          <div className="journey-grid-9">
            {SELLER_JOURNEY_9.map((j) => (
              <div key={j.num} className="journey-milestone-card">
                <span className="milestone-index">{j.num}</span>
                <div className="milestone-body">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <i className={`fa-solid ${j.icon}`} style={{ color: "#552D00", fontSize: "14px" }} aria-hidden="true"></i>
                    <h3>{j.title}</h3>
                  </div>
                  <p>{j.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 13 — FINAL CTA
          -------------------------------------------------------------------- */}
      <section className="final-cta-section">
        <div className="sell-container">
          <div className="final-cta-grid">
            <div className="final-cta-text">
              <span className="sell-kicker">Start Today</span>
              <h2>Ready to Start Selling on Arozao?</h2>
              <p>
                Bring your products online, reach customers across Bangladesh, and manage your business from one seller account.
              </p>

              <div className="final-cta-buttons">
                <Link href="/sell-on-arozao/register" className="sell-btn-primary sell-btn-accent">
                  <span>Start Selling on Arozao</span>
                  <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </Link>
                <a href="#how-it-works" className="sell-btn-secondary">
                  <span>Learn How It Works</span>
                  <i className="fa-solid fa-arrow-up" aria-hidden="true"></i>
                </a>
              </div>
            </div>

            <div className="final-cta-visual">
              <div className="final-cta-image-wrap">
                <Image
                  src="/images/bangladeshi_seller_cta_1790659594147.jpg"
                  alt="Bangladeshi woman boutique artisan and online store seller holding a neatly prepared parcel package ready for customer delivery"
                  width={640}
                  height={480}
                  sizes="(max-width: 768px) 100vw, 600px"
                  referrerPolicy="no-referrer"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <div className="final-cta-badge">
                <i className="fa-solid fa-shield-check" style={{ marginRight: 6 }}></i>
                Arozao Bangladesh Merchant Network
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 14 — FAQ
          -------------------------------------------------------------------- */}
      <section className="sell-section" id="faq">
        <div className="sell-container">
          <div className="sell-section-header">
            <span className="sell-kicker">Got Questions?</span>
            <h2 className="sell-title">Frequently Asked Questions</h2>
            <p className="sell-subtitle">
              Clear, factual answers to help you navigate your seller account and marketplace operations.
            </p>
          </div>

          <div className="sell-faq-list">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={faq.q} className={`faq-accordion-item ${isOpen ? "is-open" : ""}`}>
                  <button
                    type="button"
                    className="faq-accordion-btn"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-toggle-icon" aria-hidden="true">
                      {isOpen ? "✕" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="faq-accordion-panel">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: "44px" }}>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary, #54506B)", marginBottom: "16px" }}>
              Have another question about registering your store?
            </p>
            <div style={{ display: "inline-flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <Link href="/sell-on-arozao/register" className="sell-btn-primary">
                <span>Create Seller Account</span>
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </Link>
              <Link href="/sell-on-arozao/application-status" className="sell-btn-secondary">
                <span>Track Existing Application</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
