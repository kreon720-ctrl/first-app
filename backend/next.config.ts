import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['swagger-ui-react', 'swagger-client', 'react-syntax-highlighter'],
};

export default nextConfig;
