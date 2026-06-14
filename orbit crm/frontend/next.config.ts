import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://100.53.223.156:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
