/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Transpile problematic packages
  transpilePackages: [
    '@walletconnect/keyvaluestorage',
    '@walletconnect/core',
    '@walletconnect/sign-client',
    '@walletconnect/universal-provider',
    '@walletconnect/ethereum-provider'
  ],
  // External packages for server components
  serverExternalPackages: [
    'arena-app-store-sdk'
  ],
  compiler: {
    // Enable SWC minify for better performance
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: false,
  },
  experimental: {
    // Handle ES modules properly
    esmExternals: 'loose',
  },
  webpack: (config, { dev, isServer }) => {
    // Ensure proper path resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    }
    
    // Handle Node.js modules and polyfills for browser builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: false,
        process: false,
        util: false,
        querystring: false,
        punycode: false,
        events: false,
        child_process: false,
        worker_threads: false,
      }
      
      // Handle specific WalletConnect modules that cause issues
      config.externals = config.externals || []
      config.externals.push({
        'lokijs': 'lokijs',
        'pino-pretty': 'pino-pretty',
        'encoding': 'encoding'
      })
    }
    
    // Ignore certain modules that aren't needed in browser
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
      // Provide empty modules for Node.js specific imports
      'encoding': false,
      'pino-pretty': false,
      'lokijs': false,
    }
    
    return config
  },
}

module.exports = nextConfig
