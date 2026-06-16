/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@industrysignal/tokens',
    '@industrysignal/ui',
    '@industrysignal/i18n',
  ],
  experimental: {
    typedRoutes: true,
    // Keep the node-only browser driver out of the server bundle — it's
    // dynamically imported at runtime by lib/deliverable-pdf.ts for PDF
    // rendering (the webpackIgnore import alone can still trip the tracer).
    serverComponentsExternalPackages: ['playwright', 'playwright-core'],
  },
};

export default nextConfig;
