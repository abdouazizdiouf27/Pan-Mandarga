import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger Node.js Web App exécute l'application avec `next start`.
  // Nous n'utilisons pas le mode standalone/VPS ici.
  reactStrictMode: false,
};

export default nextConfig;
