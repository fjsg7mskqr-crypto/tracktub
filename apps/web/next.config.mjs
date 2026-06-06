import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silence the multiple-lockfile workspace-root warning.
  outputFileTracingRoot: path.join(import.meta.dirname),
};

export default nextConfig;
