import type { NextConfig } from "next";

// AI Atlas is a fully data-driven, per-request app (cookies for locale, live
// database reads), so we use classic dynamic rendering instead of Cache
// Components. Revisit once the data layer exposes cache tags.
const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["postgres"],
  poweredByHeader: false,
};

export default nextConfig;
