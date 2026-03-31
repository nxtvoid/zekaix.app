import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    '@zekaix/ui',
    '@zekaix/auth',
    '@zekaix/db',
    '@zekaix/utils'
  ]
}

export default nextConfig
