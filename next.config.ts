import type { NextConfig } from "next";

// Cache Components sú vypnuté zámerne: celá aplikácia je za prihlásením
// a takmer každá stránka číta session, takže statický shell by nič neušetril.
const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    // Doklady môžu mať najviac 5 MB, rezerva pokrýva réžiu multipart požiadavky.
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
