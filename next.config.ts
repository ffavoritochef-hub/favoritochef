import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  serverExternalPackages: ['pdfkit', 'node:buffer'],
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
