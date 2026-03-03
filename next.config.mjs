
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Generate a unique build ID per deploy to prevent chunk hash collisions
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Remove .svg from Next.js default file-loader so SVGR can handle it
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