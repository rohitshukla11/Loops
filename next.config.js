/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      child_process: false,
      buffer: false,
      stream: false,
      util: false,
      os: false,
      path: false,
    };
    return config;
  },
  env: {
    NEAR_NETWORK: process.env.NEAR_NETWORK || 'testnet',
    IPFS_GATEWAY: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
    WEB3_STORAGE_TOKEN: process.env.WEB3_STORAGE_TOKEN || '',
  },
}

module.exports = nextConfig
