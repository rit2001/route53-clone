import type { NextConfig } from "next";

import { getApiBaseUrl } from "./lib/env";

if (process.env.VERCEL === "1") {
  getApiBaseUrl();
}

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
