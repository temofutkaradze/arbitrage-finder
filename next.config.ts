import type { NextConfig } from "next";

// Live-data dashboard: pages read the database on every request, so Cache Components
// (enabled by the default scaffold) is turned off. `pg` stays external to the bundle.
const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
};

export default nextConfig;
