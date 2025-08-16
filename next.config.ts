import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/relay-iT7i/:path*',
        destination: `${process.env.NEXT_PUBLIC_POSTHOG_HOST}/:path*`,
      },
    ];
  }
};

export default nextConfig;
