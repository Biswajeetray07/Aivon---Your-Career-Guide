import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Route any request with x-backend header to the Motia backend
        // This is the most reliable way to avoid collisions with NextAuth (/api/auth)
        source: "/api/:path*",
        has: [{ type: "header", key: "x-backend", value: "true" }],
        destination: "http://127.0.0.1:3002/api/:path*",
      },
      {
        source: "/socket.io/:path*",
        destination: "http://127.0.0.1:3003/socket.io/:path*",
      },
      {
        source: "/emit",
        destination: "http://127.0.0.1:3003/emit",
      },
    ];
  },
};

export default nextConfig;
