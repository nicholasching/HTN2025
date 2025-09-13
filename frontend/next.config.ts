import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Disable symlinks to prevent Windows EINVAL errors
    esmExternals: false,
  },
  // Disable file system cache on Windows to prevent symlink issues
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Ensure proper handling of file paths on Windows
  trailingSlash: false,
  // Disable webpack cache to prevent symlink issues
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
