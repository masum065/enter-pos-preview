/** @type {import("next").NextConfig} */
const nextConfig = {
  // Compress responses with gzip
  compress: true,

  // Remove X-Powered-By header
  poweredByHeader: false,

  // Disable source maps in production (smaller client bundle)
  productionBrowserSourceMaps: false,

  // Tree-shake heavy packages at build time
  experimental: {
    optimizePackageImports: [
      "apexcharts",
      "react-apexcharts",
      "date-fns",
      "jspdf",
      "jspdf-autotable",
      "xlsx",
    ],
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", port: "" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", port: "" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", port: "" },
      { protocol: "https", hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev", port: "" },
    ],
  },
};

export default nextConfig;
