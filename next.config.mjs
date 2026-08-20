/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: { webpackBuildWorker: false },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.base44.com" }],
  },
};

export default nextConfig;
