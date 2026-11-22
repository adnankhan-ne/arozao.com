const demoProducts = [
  {
    id: 'prod-1', slug: 'wireless-headphones', name: 'Wireless headphones', category: 'gadgets', subcategory: 'audio', brand: 'Arozao', price: 3990, salePrice: 3490, discount: 12, stock: 20, status: 'active', description: 'Immersive sound with all-day comfort.', thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', rating: 4.7, reviewCount: 124, sellerId: 'seller-demo', colorVariations: [{ id: 'var-headphones-black', colorName: 'Black', colorHex: '#111827', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-headphones-silver', colorName: 'Silver', colorHex: '#c7ccd4', image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-2', slug: 'minimal-smart-watch', name: 'Minimal smart watch', category: 'gadgets', subcategory: 'wearables', brand: 'Arozao', price: 5490, salePrice: 5490, discount: 0, stock: 18, status: 'active', description: 'Track your day in a beautiful, lightweight design.', thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', rating: 4.8, reviewCount: 86, sellerId: 'seller-demo', colorVariations: [{ id: 'var-watch-rose', colorName: 'Rose Gold', colorHex: '#d4a373', image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-watch-black', colorName: 'Charcoal', colorHex: '#20232b', image: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-3', slug: 'everyday-sneakers', name: 'Everyday sneakers', category: 'boys-fashion', subcategory: 'shoes', brand: 'Arozao', price: 2490, salePrice: 2190, discount: 12, stock: 14, status: 'active', description: 'Comfortable and ready for every day.', thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80', rating: 4.5, reviewCount: 68, sellerId: 'seller-demo', colorVariations: [{ id: 'var-sneakers-white', colorName: 'White', colorHex: '#f3f4f6', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-sneakers-navy', colorName: 'Navy', colorHex: '#1d4ed8', image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-4', slug: 'daily-skincare-set', name: 'Daily skincare set', category: 'beauty', subcategory: 'care', brand: 'Arozao', price: 1290, salePrice: 1290, discount: 0, stock: 26, status: 'active', description: 'Simple essentials for your everyday routine.', thumbnail: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=800&q=80', rating: 4.6, reviewCount: 59, sellerId: 'seller-demo', colorVariations: [{ id: 'var-skincare-ivory', colorName: 'Ivory', colorHex: '#f5efe6', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-skincare-rose', colorName: 'Rose', colorHex: '#f9d7d7', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-5', slug: 'ceramic-planter', name: 'Ceramic planter', category: 'home-decor', subcategory: 'decor', brand: 'Arozao', price: 990, salePrice: 990, discount: 0, stock: 31, status: 'active', description: 'A calm, modern accent for your home.', thumbnail: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80', rating: 4.4, reviewCount: 47, sellerId: 'seller-demo', colorVariations: [{ id: 'var-planter-terracotta', colorName: 'Terracotta', colorHex: '#b45309', image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-planter-sand', colorName: 'Sand', colorHex: '#d6b98c', image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-6', slug: 'desk-lamp', name: 'Warm desk lamp', category: 'home-decor', subcategory: 'lighting', brand: 'Arozao', price: 1790, salePrice: 1690, discount: 6, stock: 22, status: 'active', description: 'Soft, warm lighting for focused evenings.', thumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', rating: 4.7, reviewCount: 72, sellerId: 'seller-demo', colorVariations: [{ id: 'var-lamp-ivory', colorName: 'Ivory', colorHex: '#f5f1e6', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-lamp-black', colorName: 'Black', colorHex: '#202327', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-7', slug: 'phone-case', name: 'Everyday phone case', category: 'phone-accessories', subcategory: 'cases', brand: 'Arozao', price: 690, salePrice: 690, discount: 0, stock: 0, status: 'out-of-stock', description: 'Slim protection with a soft-touch finish.', thumbnail: 'https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=800&q=80', rating: 4.3, reviewCount: 38, sellerId: 'seller-demo', colorVariations: [{ id: 'var-case-blue', colorName: 'Blue', colorHex: '#2563eb', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: 0 }, { id: 'var-case-pink', colorName: 'Pink', colorHex: '#f472b6', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: 0 }]
  },
  {
    id: 'prod-8', slug: 'compact-wireless-keyboard', name: 'Compact wireless keyboard', category: 'computer-accessories', subcategory: 'keyboards', brand: 'Arozao', price: 2890, salePrice: 2590, discount: 10, stock: 17, status: 'active', description: 'A tidy, quiet keyboard for work and play.', thumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', rating: 4.6, reviewCount: 51, sellerId: 'seller-demo', colorVariations: [{ id: 'var-keyboard-slate', colorName: 'Slate', colorHex: '#334155', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-keyboard-rose', colorName: 'Rose', colorHex: '#fda4af', image: 'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-9', slug: 'essential-kitchen-set', name: 'Essential kitchen set', category: 'kitchen-appliances', subcategory: 'cookware', brand: 'Arozao', price: 2290, salePrice: 2090, discount: 9, stock: 12, status: 'active', description: 'Reliable tools for everyday cooking.', thumbnail: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', rating: 4.5, reviewCount: 44, sellerId: 'seller-demo', colorVariations: [{ id: 'var-kitchen-stone', colorName: 'Stone', colorHex: '#d1d5db', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-kitchen-black', colorName: 'Black', colorHex: '#27272a', image: 'https://images.unsplash.com/photo-1556911220-cff0d4f81f5d?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-10', slug: 'soft-linen-bedding', name: 'Soft linen bedding', category: 'lifestyle', subcategory: 'bedding', brand: 'Arozao', price: 4290, salePrice: 3890, discount: 9, stock: 20, status: 'active', description: 'Relaxed comfort in a breathable weave.', thumbnail: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80', rating: 4.8, reviewCount: 96, sellerId: 'seller-demo', colorVariations: [{ id: 'var-bedding-cream', colorName: 'Cream', colorHex: '#f5f5dc', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-bedding-sage', colorName: 'Sage', colorHex: '#a3b18a', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-11', slug: 'glass-water-bottle', name: 'Glass water bottle', category: 'lifestyle', subcategory: 'hydration', brand: 'Arozao', price: 1290, salePrice: 1190, discount: 8, stock: 28, status: 'active', description: 'A clean everyday carry for hydration on the move.', thumbnail: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80', rating: 4.4, reviewCount: 41, sellerId: 'seller-demo', colorVariations: [{ id: 'var-bottle-green', colorName: 'Forest Green', colorHex: '#2f6f3e', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-bottle-amber', colorName: 'Amber', colorHex: '#d97706', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-12', slug: 'cotton-knit-hoodie', name: 'Cotton knit hoodie', category: 'girls-fashion', subcategory: 'apparel', brand: 'Arozao', price: 2890, salePrice: 2490, discount: 14, stock: 24, status: 'active', description: 'Soft texture and an easy everyday silhouette.', thumbnail: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', rating: 4.6, reviewCount: 57, sellerId: 'seller-demo', colorVariations: [{ id: 'var-hoodie-cream', colorName: 'Cream', colorHex: '#f5efe2', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-hoodie-mint', colorName: 'Mint', colorHex: '#99f6e4', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  },
  {
    id: 'prod-13', slug: 'portable-speaker-mini', name: 'Portable speaker mini', category: 'electronics', subcategory: 'audio', brand: 'Arozao', price: 990, salePrice: 890, discount: 10, stock: 32, status: 'active', description: 'Pocket-sized sound for coffee breaks and travel.', thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80', rating: 4.3, reviewCount: 33, sellerId: 'seller-demo', colorVariations: [{ id: 'var-speaker-red', colorName: 'Red', colorHex: '#ef4444', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }, { id: 'var-speaker-black', colorName: 'Black', colorHex: '#111827', image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80', priceOverride: null, stockOverride: null }]
  }
];

export function initializeDemoStore() {
  return {
    products: demoProducts,
    users: [
      {
        id: 'demo-customer',
        name: 'Demo Customer',
        email: 'demo@arozao.com',
        passwordHash: 'demo-password',
        role: 'customer',
        createdAt: new Date().toISOString()
      }
    ],
    sellers: [
      {
        id: 'seller-demo',
        userId: 'demo-customer',
        storeName: 'Arozao Studio',
        status: 'approved'
      }
    ],
    orders: [
      {
        id: 'order-demo-1001',
        customerId: 'demo-customer',
        items: [
          { productId: 'prod-1', variationId: 'var-headphones-black', qty: 1, priceAtPurchase: 3490, sellerId: 'seller-demo' }
        ],
        status: 'Processing',
        paymentMethod: 'Cash on delivery',
        total: 3490,
        createdAt: new Date().toISOString(),
        shippingAddress: 'Dhaka'
      }
    ]
  };
}

export function createUser(store, { name, email, password, role = 'customer' }) {
  const user = {
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name,
    email,
    passwordHash: password,
    role,
    createdAt: new Date().toISOString()
  };

  store.users.push(user);
  return user;
}

export function getCurrentCustomerOrders(store, customerId) {
  return store.orders.filter((order) => order.customerId === customerId);
}
