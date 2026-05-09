/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    // Support Web Workers
    if (!isServer) {
      config.output.globalObject = 'self';
    }
    return config;
  }
}

module.exports = nextConfig
