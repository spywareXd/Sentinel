/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/Sentinel',
  assetPrefix: '/Sentinel/',
};

module.exports = nextConfig;