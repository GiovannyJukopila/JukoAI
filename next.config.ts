import type { NextConfig } from "next";
import path from "node:path";

// Browser-side hardening for every response
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Pin the workspace root to this project (multiple lockfiles exist on the machine)
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Serve modern, smaller image formats and cache the optimized output aggressively
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
  },
  // Tree-shake framer-motion's barrel import so each component only ships what it uses
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
};

export default nextConfig;
