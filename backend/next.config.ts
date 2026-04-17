import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['swagger-ui-react', 'swagger-client', 'react-syntax-highlighter'],
  async headers() {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: frontendUrl },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
