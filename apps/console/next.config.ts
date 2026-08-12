import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ds', '@repo/react-web']
}

export default nextConfig
