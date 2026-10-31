import { fileURLToPath } from "url";
import { dirname } from "path";
import withPWAInit from "next-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize PWA plugin properly
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// Base Next.js config
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/customer", permanent: false },
      { source: "/dashboard/orders", destination: "/customer/new-order", permanent: false },
      { source: "/dashboard/history", destination: "/customer/orders", permanent: false },
      { source: "/dashboard/invoices", destination: "/customer/invoices", permanent: false },
      { source: "/dashboard/invoice", destination: "/customer/invoices", permanent: false },
      { source: "/dashboard/payments", destination: "/customer/invoices", permanent: false },
    ];
  },
};

export default withPWA(nextConfig);
