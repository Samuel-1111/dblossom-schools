/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: { webpackBuildWorker: false },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.base44.com" }],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.manus-logs/**", "**/.next/**", "**/.next-dev/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
