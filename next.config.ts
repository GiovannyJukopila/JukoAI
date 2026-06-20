import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
