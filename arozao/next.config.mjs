const phpApiUrl = (process.env.PHP_API_URL || 'http://localhost/Arozao%20Website/api').replace(/\/+$/, '');

/** @type {(phase: string) => import('next').NextConfig} */
const nextConfig = (phase) => ({
  distDir: phase === 'phase-development-server' ? '.next-dev' : '.next',
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  rewrites: async () => ({
    afterFiles: [
      {
        source: '/api/categories',
        destination: `${phpApiUrl}/categories`,
      },
    ],
  }),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'easydrop.asia',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
});

export default nextConfig;
