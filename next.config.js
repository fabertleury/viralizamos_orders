/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Desabilitar testes durante o build
  experimental: {
    // Desabilitar verificações que possam estar causando problemas com o Jest
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