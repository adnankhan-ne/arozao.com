import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell on Arozao | Start Selling Online in Bangladesh",
  description:
    "Start selling your products on Arozao and reach customers across Bangladesh. Create your seller account, list products, manage orders, and grow your online business.",
  openGraph: {
    title: "Sell on Arozao | Start Selling Online in Bangladesh",
    description:
      "Start selling your products on Arozao and reach customers across Bangladesh. Create your seller account, list products, manage orders, and grow your online business.",
    type: "website",
    locale: "en_BD",
    siteName: "Arozao Bangladesh",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sell on Arozao | Start Selling Online in Bangladesh",
    description:
      "Start selling your products on Arozao and reach customers across Bangladesh. Create your seller account, list products, manage orders, and grow your online business.",
  },
};

export default function SellOnArozaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
