import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    GOOGLE_DRIVE_DOCUMENT_FOLDER_ID: process.env.GOOGLE_DRIVE_DOCUMENT_FOLDER_ID,
    GOOGLE_COURSE_FOLDER_ID: process.env.GOOGLE_COURSE_FOLDER_ID,
  },
  experimental: {
    clientTraceMetadata: undefined, // Disable experimental feature
  },
  telemetry: false, // Disable Next.js telemetry
};

export default withSentryConfig(nextConfig, {
  org: 'klariti-lms',
  project: 'lms-sentry-nextjs',
  // Use silent: true to suppress logs in all environments except CI
  silent: process.env.CI ? false : true,
  // Disable source map uploads to reduce memory usage
  widenClientFileUpload: false,
  // Disable Vercel-specific features since using GCP
  automaticVercelMonitors: false,
  // Reduce bundle size by tree-shaking Sentry logger
  disableLogger: true,
});