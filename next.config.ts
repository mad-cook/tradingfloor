import type { NextConfig } from 'next';
const config: NextConfig = { distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next', reactStrictMode: true, devIndicators: false, outputFileTracingRoot: process.cwd() }; export default config;

