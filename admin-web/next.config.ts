import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  async rewrites() {
    return [
      "/dashboard",
      "/orders",
      "/stores",
      "/users",
      "/products",
      "/payments",
      "/offers",
      "/support",
      "/submissions",
      "/delivery",
      "/reports",
      "/audit-log",
      "/sub-admins",
    ].map((route) => ({ source: route, destination: "/" }));
  },
};

export default nextConfig;
