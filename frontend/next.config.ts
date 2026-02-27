import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:3000";
    const socketUrl = process.env.SOCKET_INTERNAL_URL || "http://127.0.0.1:3003";

    return [
      {
        // Route any request with x-backend header to the Motia backend
        source: "/api/:path*",
        has: [{ type: "header", key: "x-backend", value: "true" }],
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${socketUrl}/socket.io/:path*`,
      },
      {
        source: "/emit",
        destination: `${socketUrl}/emit`,
      },
    ];
  },
};

export default nextConfig;
