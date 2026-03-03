
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer, webpack: wp }) => {
    // Force new content hashes every deploy by salting webpack's hash function
    config.output.hashSalt = `deploy-${Date.now()}`;

    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test instanceof RegExp && rule.test.test('.svg')
    );
    if (fileLoaderRule) {
      fileLoaderRule.exclude = /\.svg$/i;
    }

    // Add SVGR loader so SVG files can be imported as React components
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    return config;
  }
}

export default nextConfig