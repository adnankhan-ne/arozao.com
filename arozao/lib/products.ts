import { Product } from "@/types";
import { easydropProducts } from "./easydrop-products";

const image = (id: string, width = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

const originalProducts: Product[] = [
  ["everyday-sneakers", "Everyday sneakers", "boys-fashion", "Shoes", "Arozao", 2490, undefined, "Comfortable and ready for every day.", "photo-1542291026-7eec264c27ff"],
  ["wireless-headphones", "Wireless headphones", "gadgets", "Audio", "Arozao", 3990, 3490, "Immersive sound, comfortable fit, and reliable battery life.", "photo-1505740420928-5e560c06d30e"],
  ["daily-skincare-set", "Daily skincare set", "girls-fashion", "Beauty", "Arozao", 1290, undefined, "Simple essentials for your everyday routine.", "photo-1556228578-8c89e6adf883"],
  ["smart-watch", "Minimal smart watch", "gadgets", "Wearables", "Arozao", 5490, undefined, "Track your day in a beautiful, lightweight design.", "photo-1523275335684-37898b6baf30"],
  ["desk-lamp", "Warm desk lamp", "home-decor", "Lighting", "Arozao", 1790, undefined, "Soft, warm lighting for focused evenings.", "photo-1507473885765-e6ed057f782c"],
  ["ceramic-planter", "Ceramic planter", "showpieces", "Home accessories", "Arozao", 990, undefined, "A calm, modern accent for your home.", "photo-1485955900006-10f4d324d411"],
  ["phone-case", "Everyday phone case", "phone-accessories", "Cases", "Arozao", 690, undefined, "Slim protection with a soft-touch finish.", "photo-1601593346740-925612772716"],
  ["keyboard", "Compact wireless keyboard", "computer-accessories", "Keyboards", "Arozao", 2890, undefined, "A tidy, quiet keyboard for work and play.", "photo-1587829741301-dc798b83add3"],
  ["kitchen-set", "Essential kitchen set", "kitchen-appliances", "Cookware", "Arozao", 2290, undefined, "Reliable tools for everyday cooking.", "photo-1556911220-e15b29be8c8f"],
  ["linen-bedding", "Soft linen bedding", "lifestyle", "Bedding", "Arozao", 4290, 3890, "Relaxed comfort in a breathable weave.", "photo-1616486338812-3dadae4b4ace"]
].map(([slug, name, category, subcategory, brand, price, salePrice, description, photo], index) => {
  const thumbnail = image(photo as string);
  const basePrice = price as number;
  const discountedPrice = salePrice as number | undefined;
  return {
    id: `arozao-${String(index + 1).padStart(4, "0")}`, sku: `ARZ-${String(index + 1).padStart(4, "0")}`,
    slug: slug as string, name: name as string, shortDescription: description as string,
    category: category as string, subcategory: subcategory as string, brand: brand as string,
    price: basePrice, salePrice: discountedPrice ?? basePrice,
    discount: discountedPrice ? Math.round((1 - discountedPrice / basePrice) * 100) : 0,
    currency: "BDT", stock: index === 6 ? 0 : 18 + index, availability: index === 6 ? "out-of-stock" : "in-stock", images: [thumbnail], thumbnail,
    specifications: { Material: "Premium quality", "Care": "Use as directed" },
    features: ["Thoughtfully selected", "Dependable quality"], tags: [category as string, subcategory as string, "everyday"], keywords: [name as string, category as string, subcategory as string],
    reviewCount: 24 + index * 13, status: index === 6 ? "out-of-stock" : "active",
    featured: index < 4, bestseller: index === 1 || index === 0, newArrival: index > 6,
    createdAt: "2026-01-15T00:00:00.000Z", updatedAt: "2026-08-20T00:00:00.000Z",
    description: description as string, image: thumbnail, rating: 4.6
  } satisfies Product;
});

export const products: Product[] = originalProducts.concat(easydropProducts);

export const categories = [
  { slug: "electronics", name: "Electronics" },
  { slug: "fashion", name: "Fashion" },
  { slug: "beauty", name: "Beauty & Personal Care" },
  { slug: "home", name: "Home & Living" },
  { slug: "kitchen", name: "Kitchen" },
  { slug: "phone-accessories", name: "Phone Accessories" }, { slug: "computer-accessories", name: "Computer Accessories" },
  { slug: "gadgets", name: "Gadgets" }, { slug: "home-decor", name: "Home Decor" },
  { slug: "kitchen-appliances", name: "Kitchen Appliances" }, { slug: "lifestyle", name: "Lifestyle" },
  { slug: "showpieces", name: "Showpieces" }, { slug: "girls-fashion", name: "Girls Fashion" },
  { slug: "boys-fashion", name: "Boys Fashion" }
];

export const getProduct = (slug: string) => products.find((product) => product.slug === slug);
export const getCategory = (slug: string) => categories.find((category) => category.slug === slug);

export interface CatalogQueryFilters {
  category?: string;
  subcategory?: string;
  brand?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  bestseller?: boolean;
  limit?: number;
  offset?: number;
}

export const getCatalogProductsFromDb = async (filters?: CatalogQueryFilters) => {
  let list = products.filter((p) => p.status === "active");
  if (filters?.category) {
    list = list.filter((p) => p.category.toLowerCase() === filters.category?.toLowerCase());
  }
  if (filters?.subcategory) {
    list = list.filter((p) => p.subcategory?.toLowerCase() === filters.subcategory?.toLowerCase());
  }
  if (filters?.brand) {
    list = list.filter((p) => p.brand?.toLowerCase() === filters.brand?.toLowerCase());
  }
  if (filters?.featured) {
    list = list.filter((p) => Boolean(p.featured));
  }
  if (filters?.bestseller) {
    list = list.filter((p) => Boolean(p.bestseller));
  }
  if (typeof filters?.minPrice === "number") {
    list = list.filter((p) => (p.salePrice ?? p.price) >= (filters.minPrice as number));
  }
  if (typeof filters?.maxPrice === "number") {
    list = list.filter((p) => (p.salePrice ?? p.price) <= (filters.maxPrice as number));
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.shortDescription && p.shortDescription.toLowerCase().includes(q))
    );
  }
  const totalCount = list.length;
  if (typeof filters?.limit === "number") {
    const start = filters?.offset || 0;
    list = list.slice(start, start + filters.limit);
  }
  return { products: list, totalCount };
};

export const getProductBySlug = async (slug: string) => {
  const p = products.find((prod) => prod.slug === slug);
  return { product: p || null };
};

export const getProductBySlugFromDb = async (slug: string) => {
  return products.find((prod) => prod.slug === slug) || null;
};

export const getCategoriesFromDb = async () => categories;

export const getCategoryBySlugFromDb = async (slug: string) => {
  return categories.find((category) => category.slug === slug) || null;
};

export const getRelatedProductsFromDb = async (product: Product, limit = 4) => {
  return products
    .filter((p) => p.category === product.category && p.slug !== product.slug && p.status === "active")
    .slice(0, limit);
};

