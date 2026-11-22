import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    "https://arozao.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/products", "/product/", "/category/", "/sell"],
        disallow: ["/api/", "/admin/", "/seller/", "/checkout", "/account"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
