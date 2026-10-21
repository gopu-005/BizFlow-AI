/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      { source: '/app/settings', destination: '/settings' },
      { source: '/app/team', destination: '/team' },
      { source: '/app/profile', destination: '/profile' },
      { source: '/app/invoices', destination: '/invoices' },
      { source: '/app/inventory', destination: '/inventory' },
      { source: '/app/customers', destination: '/customers' },
      { source: '/app/udhaar', destination: '/udhaar' },
      { source: '/app/closing', destination: '/closing' },
      { source: '/app/reports', destination: '/reports' },
      { source: '/app/billing', destination: '/billing' },
      { source: '/app/sales', destination: '/sales' },
      { source: '/app/import', destination: '/import' },
      { source: '/app/agent', destination: '/agent' },
      { source: '/app/connectors', destination: '/connectors' },
    ];
  },
};

export default nextConfig;
