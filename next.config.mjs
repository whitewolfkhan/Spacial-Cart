/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow loading .glb models and let three.js transpile cleanly.
  transpilePackages: ["three"],
  experimental: {
    // .glb model uploads via Server Actions can exceed the 1MB default.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
