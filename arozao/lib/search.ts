import { Product } from "@/types";

const banglaEnglishMap: Record<string, string[]> = {
  "ঘড়ি": ["watch", "smartwatch", "clock"],
  "স্পিকার": ["speaker", "bluetooth", "sound", "audio"],
  "হেডফোন": ["headphone", "earphone", "earbuds", "audio", "headset"],
  "ইয়ারফোন": ["earphone", "earbuds", "headphone"],
  "ইয়ারবাডস": ["earbuds", "earphone", "headphone"],
  "চার্জার": ["charger", "adapter", "charging"],
  "ক্যাবল": ["cable", "cord", "wire"],
  "লাইট": ["light", "lamp", "led", "lighting"],
  "কেস": ["case", "cover"],
  "কভার": ["cover", "case"],
  "স্ট্যান্ড": ["stand", "holder", "mount"],
  "হোল্ডার": ["holder", "stand", "mount"],
  "ব্যাগ": ["bag", "backpack", "wallet", "purse"],
  "জুতা": ["shoe", "shoes", "sneaker", "sneakers", "footwear"],
  "জুতো": ["shoe", "shoes", "sneaker", "sneakers", "footwear"],
  "বোতল": ["bottle", "flask", "thermos"],
  "কিবোর্ড": ["keyboard", "keypad"],
  "মাউস": ["mouse"],
  "ফ্যান": ["fan", "cooler"],
  "ব্রাশ": ["brush"],
  "ব্লুটুথ": ["bluetooth", "wireless"],
  "ওয়ারলেস": ["wireless", "bluetooth"],
  "ক্যামেরা": ["camera", "webcam"],
  "মাইক্রোফোন": ["microphone", "mic"],
  "ট্রাইপড": ["tripod"],
  "চশমা": ["glass", "glasses", "sunglasses"],
  "পাওয়ারব্যাংক": ["powerbank", "power bank", "charger"],
};

const englishBanglaMap: Record<string, string[]> = {};
for (const [bn, enList] of Object.entries(banglaEnglishMap)) {
  for (const en of enList) {
    if (!englishBanglaMap[en]) englishBanglaMap[en] = [];
    englishBanglaMap[en].push(bn);
  }
}

const englishSynonyms: Record<string, string[]> = {
  watch: ["watches", "smartwatch", "smart watch", "wrist watch", "clock", "timepiece"],
  watches: ["watch", "smartwatch", "smart watch"],
  smartwatch: ["smart watch", "watch", "wearables"],
  "smart watch": ["smartwatch", "watch", "wearables"],
  shoe: ["shoes", "sneaker", "sneakers", "footwear"],
  shoes: ["shoe", "sneaker", "sneakers", "footwear"],
  sneaker: ["sneakers", "shoe", "shoes"],
  sneakers: ["sneaker", "shoe", "shoes"],
  headphone: ["headphones", "earphone", "earphones", "earbuds", "headset"],
  headphones: ["headphone", "earphone", "earphones", "earbuds", "headset"],
  earbud: ["earbuds", "earphone", "headphones"],
  earbuds: ["earbud", "earphone", "earphones", "headphones"],
  speaker: ["speakers", "audio", "soundbar", "soundbox"],
  speakers: ["speaker", "audio", "soundbar", "soundbox"],
  lamp: ["lamps", "light", "lights", "lighting"],
  light: ["lights", "lamp", "lamps", "led", "lighting"],
  lights: ["light", "lamp", "lamps", "led", "lighting"],
  bottle: ["bottles", "flask", "water bottle"],
  bottles: ["bottle", "flask", "water bottle"],
  stand: ["stands", "holder", "holders", "mount", "dock"],
  stands: ["stand", "holder", "holders", "mount"],
  holder: ["holders", "stand", "stands", "mount"],
  holders: ["holder", "stand", "stands", "mount"],
  case: ["cases", "cover", "covers"],
  cases: ["case", "cover", "covers"],
  cover: ["covers", "case", "cases"],
  brush: ["brushes"],
  brushes: ["brush"],
  box: ["boxes"],
  boxes: ["box"],
  cable: ["cables", "cord", "wire"],
  cables: ["cable", "cord", "wire"],
  charger: ["chargers", "adapter", "charging"],
  chargers: ["charger", "adapter"],
  tshirt: ["t-shirt", "t shirt", "tee", "shirt"],
  "t shirt": ["tshirt", "t-shirt", "tee", "shirt"],
  "t-shirt": ["tshirt", "t shirt", "tee", "shirt"],
};

export const normalize = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff\s_-]+/gi, " ")
    .replace(/[-_]+/g, " ")
    .trim();

export function stemWord(word: string): string[] {
  const stems = new Set<string>([word]);
  if (word.endsWith("ies") && word.length > 4) {
    stems.add(word.slice(0, -3) + "y");
  }
  if (word.endsWith("es") && word.length > 3) {
    stems.add(word.slice(0, -2));
  }
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 2) {
    stems.add(word.slice(0, -1));
  }
  if (word.endsWith("ing") && word.length > 4) {
    stems.add(word.slice(0, -3));
  }
  if (word.endsWith("ed") && word.length > 4) {
    stems.add(word.slice(0, -2));
  }
  return Array.from(stems);
}

const stopWords = new Set([
  "for", "with", "and", "the", "in", "of", "to", "a", "an", "at", "by", "on", "from"
]);

export const categoryMappings: Record<string, { categories: string[]; subcategories?: string[] }> = {
  electronics: {
    categories: ["electronics", "gadgets", "phone-accessories", "computer-accessories"],
  },
  gadgets: {
    categories: ["gadgets", "electronics"],
    subcategories: ["smart-devices", "audio", "Wearables", "Audio"],
  },
  "phone-accessories": {
    categories: ["phone-accessories", "electronics"],
    subcategories: ["mobile-accessories", "Cases"],
  },
  "phone accessories": {
    categories: ["phone-accessories", "electronics"],
    subcategories: ["mobile-accessories", "Cases"],
  },
  phones: {
    categories: ["phone-accessories", "electronics"],
    subcategories: ["mobile-accessories", "Cases"],
  },
  "computer-accessories": {
    categories: ["computer-accessories", "electronics"],
    subcategories: ["computer-accessories", "Keyboards"],
  },
  "computer accessories": {
    categories: ["computer-accessories", "electronics"],
    subcategories: ["computer-accessories", "Keyboards"],
  },
  computers: {
    categories: ["computer-accessories", "electronics"],
    subcategories: ["computer-accessories", "Keyboards"],
  },
  "gaming accessories": {
    categories: ["electronics", "gadgets", "computer-accessories", "phone-accessories"],
    subcategories: ["audio", "smart-devices", "computer-accessories", "Keyboards"],
  },
  gaming: {
    categories: ["electronics", "gadgets", "computer-accessories"],
  },
  home: {
    categories: ["home", "home-decor", "lifestyle", "showpieces"],
  },
  "home-decor": {
    categories: ["home-decor", "home", "showpieces", "lifestyle"],
  },
  "home decor": {
    categories: ["home-decor", "home", "showpieces", "lifestyle"],
  },
  "home essentials": {
    categories: ["home", "home-decor", "kitchen", "kitchen-appliances", "lifestyle", "showpieces"],
  },
  kitchen: {
    categories: ["kitchen", "kitchen-appliances"],
  },
  "kitchen-appliances": {
    categories: ["kitchen-appliances", "kitchen"],
  },
  "kitchen appliances": {
    categories: ["kitchen-appliances", "kitchen"],
  },
  "kitchen applications": {
    categories: ["kitchen-appliances", "kitchen"],
  },
  lifestyle: {
    categories: ["lifestyle", "home"],
  },
  showpieces: {
    categories: ["showpieces", "home", "home-decor"],
  },
  fashion: {
    categories: ["fashion", "boys-fashion", "girls-fashion"],
  },
  "fashion trends": {
    categories: ["fashion", "boys-fashion", "girls-fashion"],
  },
  "girls-fashion": {
    categories: ["girls-fashion", "fashion"],
    subcategories: ["womens-fashion", "Beauty", "skincare"],
  },
  "girls fashion": {
    categories: ["girls-fashion", "fashion"],
    subcategories: ["womens-fashion", "Beauty", "skincare"],
  },
  girls: {
    categories: ["girls-fashion", "fashion"],
    subcategories: ["womens-fashion", "Beauty", "skincare"],
  },
  "boys-fashion": {
    categories: ["boys-fashion", "fashion"],
    subcategories: ["mens-fashion", "Shoes"],
  },
  "boys fashion": {
    categories: ["boys-fashion", "fashion"],
    subcategories: ["mens-fashion", "Shoes"],
  },
  boys: {
    categories: ["boys-fashion", "fashion"],
    subcategories: ["mens-fashion", "Shoes"],
  },
  beauty: {
    categories: ["beauty", "girls-fashion"],
  },
  general: {
    categories: ["general"],
  },
};

export function matchCategory(product: Product, category: string): boolean {
  if (!category) return true;
  const normCat = normalize(category);
  if (!normCat) return true;

  const prodCatNorm = normalize(product.category || "");
  const prodSubcatNorm = normalize(product.subcategory || "");

  if (prodCatNorm === normCat || prodSubcatNorm === normCat) return true;
  if (product.category === category || product.subcategory === category) return true;
  if (product.category === category.replace(/ /g, "-") || product.subcategory === category.replace(/ /g, "-")) return true;

  const mapping =
    categoryMappings[normCat] ||
    categoryMappings[category] ||
    categoryMappings[category.replace(/ /g, "-")];

  if (mapping) {
    const catMatch = mapping.categories.some(
      (c) => c === product.category || normalize(c) === prodCatNorm
    );
    if (!catMatch) return false;

    if (mapping.subcategories && mapping.subcategories.length > 0) {
      const subMatch = mapping.subcategories.some(
        (sc) => sc === product.subcategory || normalize(sc) === prodSubcatNorm
      );
      if (subMatch) return true;
      if (product.category === category || product.category === category.replace(/ /g, "-")) {
        return true;
      }
      return false;
    }
    return true;
  }

  return false;
}

const productSearchTextCache = new WeakMap<Product, string>();

export function getProductSearchText(product: Product): string {
  let cached = productSearchTextCache.get(product);
  if (!cached) {
    const raw = [
      product.name || "",
      product.sku || "",
      product.brand || "",
      product.category || "",
      product.subcategory || "",
      product.shortDescription || "",
      product.description || "",
      ...(product.tags || []),
      ...(product.keywords || []),
    ].join(" ");
    cached = normalize(raw);
    productSearchTextCache.set(product, cached);
  }
  return cached;
}

export function productMatches(product: Product, query = "", category = ""): boolean {
  if (category && !matchCategory(product, category)) {
    return false;
  }

  const normQuery = normalize(query);
  if (!normQuery) return true;

  const aliasMapping = categoryMappings[normQuery] || categoryMappings[query.trim().toLowerCase()];
  if (aliasMapping && matchCategory(product, normQuery)) {
    return true;
  }

  const normRaw = getProductSearchText(product);
  const productTokens = normRaw.split(/\s+/);

  const rawTokens = normQuery.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return true;

  const meaningfulTokens = rawTokens.filter((t) => !stopWords.has(t));
  const queryTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

  return queryTokens.every((qToken) => {
    if (normRaw.includes(qToken)) return true;

    const stems = stemWord(qToken);
    for (const stem of stems) {
      if (normRaw.includes(stem)) return true;
      if (productTokens.some((pt) => pt.includes(stem) || pt.startsWith(stem))) return true;
    }

    const syns = englishSynonyms[qToken] || [];
    for (const syn of syns) {
      const normSyn = normalize(syn);
      if (normRaw.includes(normSyn)) return true;
      if (productTokens.some((pt) => pt.includes(normSyn) || pt.startsWith(normSyn))) return true;
    }

    const enList = banglaEnglishMap[qToken] || [];
    for (const en of enList) {
      if (normRaw.includes(en)) return true;
      if (productTokens.some((pt) => pt.includes(en) || pt.startsWith(en))) return true;
    }

    const bnList = englishBanglaMap[qToken] || [];
    for (const bn of bnList) {
      if (normRaw.includes(bn)) return true;
    }

    if (qToken.length >= 4) {
      const prefix = qToken.slice(0, Math.max(3, qToken.length - 1));
      if (productTokens.some((pt) => pt.startsWith(prefix))) return true;
    }

    return false;
  });
}

export function scoreProduct(product: Product, query = ""): number {
  const normQuery = normalize(query);
  if (!normQuery) return 0;

  let score = 0;
  const nameNorm = normalize(product.name || "");
  const skuNorm = normalize(product.sku || "");
  const brandNorm = normalize(product.brand || "");
  const catNorm = normalize(product.category || "");
  const subcatNorm = normalize(product.subcategory || "");
  const tagsNorm = (product.tags || []).map(normalize).join(" ");
  const keywordsNorm = (product.keywords || []).map(normalize).join(" ");

  if (nameNorm === normQuery) score += 150;
  else if (nameNorm.startsWith(normQuery)) score += 100;
  else if (nameNorm.includes(normQuery)) score += 80;

  if (skuNorm === normQuery) score += 120;
  if (brandNorm.includes(normQuery)) score += 60;
  if (catNorm.includes(normQuery) || subcatNorm.includes(normQuery)) score += 40;
  if (tagsNorm.includes(normQuery) || keywordsNorm.includes(normQuery)) score += 35;

  const qWords = normQuery.split(/\s+/).filter((w) => !stopWords.has(w));
  for (const word of qWords) {
    if (nameNorm.includes(word)) score += 25;
    if (tagsNorm.includes(word) || keywordsNorm.includes(word)) score += 15;
    if (brandNorm.includes(word)) score += 15;
  }

  if (product.availability === "in-stock") score += 5;
  if (product.featured) score += 3;
  if (product.bestseller) score += 2;

  return score;
}

export function searchProducts(products: Product[], query = "", category = "") {
  const matches = products.filter((product) => productMatches(product, query, category));
  if (!query.trim()) return matches;
  return matches.sort((a, b) => scoreProduct(b, query) - scoreProduct(a, query));
}
