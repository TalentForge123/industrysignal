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
  },
};

export default nextConfig;
