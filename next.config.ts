import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lib.thevibecodedcompany.com",
      },
      {
        protocol: "https",
        hostname: "pub-7d1b6a5df85a4e308714a375e9ac81f7.r2.dev",
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year — assets are content-hashed
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Permissions-Policy",
          value: "geolocation=(), microphone=(), camera=()",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
      ],
    },
    {
      // Aggressive caching for R2 CDN images proxied through Next.js Image
      source: "/_next/image",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
};

export default nextConfig;
