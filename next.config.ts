import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      ...(process.env.R2_PUBLIC_URL ? [{
        protocol: 'https' as const,
        hostname: new URL(process.env.R2_PUBLIC_URL).hostname,
      }] : []),
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
