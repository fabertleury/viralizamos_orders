/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configurações para evitar problemas com o Jest
  experimental: {
    esmExternals: 'loose',
  },
  // Desabilitar verificações automáticas de tipos
  typescript: {
    ignoreBuildErrors: true,
  },
  // Desabilitar o linting durante o build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Tratamento especial para erros de build
  output: 'standalone',
  // Configurações para resolver problemas de exportação
  distDir: '.next',
  // Ignorar erros de exportação (especialmente útil para path específicos)
  onDemandEntries: {
    // Período em ms em que a página deve permanecer no buffer
    maxInactiveAge: 60 * 1000,
    // Número de páginas que devem ser mantidas simultaneamente sem serem descartadas
    pagesBufferLength: 5,
  },
  // Configurações adicionais para o webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignora arquivos relacionados ao Jest
      config.resolve.alias = {
        ...config.resolve.alias,
        // Evitar importações de pacotes relacionados ao Jest
        'jest-worker': false,
        'jest-runtime': false,
      };
    }
    return config;
  },
}

module.exports = nextConfig 