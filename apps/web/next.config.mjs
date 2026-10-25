const sharedSecurityHeaders = [
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=()',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Permitted-Cross-Domain-Policies',
    value: 'none',
  },
];

const productionSecurityHeaders =
  process.env.NODE_ENV === 'production'
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : [];

// Content Security Policy is intentionally handled by the request proxy later.
// Per-request nonces avoid weakening production policy with a global unsafe-inline rule.
/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  transpilePackages: [
    '@attravoya/api-client',
    '@attravoya/constants',
    '@attravoya/design-tokens',
    '@attravoya/localization',
    '@attravoya/shared-types',
    '@attravoya/utilities',
    '@attravoya/validation',
  ],
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';
    const destination = new URL(apiUrl);
    if (
      !['http:', 'https:'].includes(destination.protocol) ||
      destination.username ||
      destination.password
    ) {
      throw new Error('NEXT_PUBLIC_API_BASE_URL must be an HTTP(S) origin.');
    }
    const apiOrigin = destination.origin;
    return [{ source: '/api/v1/:path*', destination: `${apiOrigin}/api/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [...sharedSecurityHeaders, ...productionSecurityHeaders],
      },
    ];
  },
};

export default nextConfig;
