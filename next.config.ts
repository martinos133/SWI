import type { NextConfig } from "next";

// Cache Components sú vypnuté zámerne: celá aplikácia je za prihlásením
// a takmer každá stránka číta session, takže statický shell by nič neušetril.
const nextConfig: NextConfig = {
  experimental: {
    // Doklady môžu mať do 5 MB (+ réžia multipart).
    serverActions: { bodySizeLimit: "6mb" },
  },
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
