import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure these packages are treated as external for server-side rendering
  // This prevents Next.js from trying to parse them during SSR
  serverExternalPackages: ['jspdf', 'canvg', 'html2canvas', 'xlsx'],
  
  // Configure webpack for non-Turbopack builds
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'jspdf': 'commonjs jspdf',
        'canvg': 'commonjs canvg',
        'html2canvas': 'commonjs html2canvas',
        'xlsx': 'commonjs xlsx',
      });
    }
    return config;
  },
};

export default nextConfig;
