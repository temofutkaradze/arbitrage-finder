import type { NextConfig } from "next";

// Live-data dashboard: pages read the database on every request, so Cache Components
// (enabled by the default scaffold) is turned off. `pg` stays external to the bundle.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "same-origin" },
    { key: "Cache-Control", value: "private, no-store" },
  ] }]; },
  serverExternalPackages: ["pg"],
};

export default nextConfig;
