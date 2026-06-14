module.exports = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  images: {
    unoptimized: true,
    domains: ['firebasestorage.googleapis.com', 'static.vecteezy.com', 'storage.googleapis.com'],
  },
};
