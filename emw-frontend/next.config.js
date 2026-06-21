module.exports = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    // ignoreBuildErrors: false (remover el flag que ocultaba errores TS)
    // Errors deben ser arreglados antes de mergear o bloqueados en pre-commit
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  images: {
    unoptimized: true,
    domains: ['firebasestorage.googleapis.com', 'static.vecteezy.com', 'storage.googleapis.com'],
  },
};
