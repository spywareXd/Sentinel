import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

// Load the shared root .env (one directory up from /frontend)
loadEnvConfig(path.resolve(__dirname, ".."));

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
