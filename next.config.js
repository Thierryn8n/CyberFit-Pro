/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  // Excluir arquivos Supabase Edge Functions do build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Ignorar pasta supabase durante o build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  transpilePackages: [],
};

module.exports = nextConfig;