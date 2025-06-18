
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      { // Updated for Supabase Storage to include signed URLs
        protocol: 'https',
        hostname: 'wlinjhdynghwfzoegvdi.supabase.co', // Your Supabase project URL hostname
        port: '',
        pathname: '/storage/v1/object/**', // Made more general to cover /public/ and /sign/ paths
      },
      { // Added for th.bing.com
        protocol: 'https',
        hostname: 'th.bing.com',
        port: '',
        pathname: '/**',
      },
      { // Added for www.google.com
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/**',
      },
      { // Added for Unsplash
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      { // Added for Pexels
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
