module.exports = {
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
  experimental: {
    isrMemoryCacheSize: 0,
  },
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60,
    pagesBufferLength: 2,
  },
  staticPageGenerationTimeout: 120,
  // outputStandalone: true,  // Only for Docker/Cloud Run, not needed for Vercel
  productionBrowserSourceMaps: false,
  // Desabilitar SSG por problema con <Html> import durante prerender
  // Usar SSR en su lugar (getServerSideProps o sin export)
};
