declare module 'next-pwa' {
  import { NextConfig } from 'next';
  function withPWA(nextConfig: NextConfig): NextConfig;
  export default withPWA;
}
