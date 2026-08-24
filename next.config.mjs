/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: { webpackBuildWorker: false },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.base44.com" }],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.manus-logs/**", "**/.next/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
