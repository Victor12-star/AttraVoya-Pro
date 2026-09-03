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
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Referrer-Policy',
    value: 'no-referrer',
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
  {
    key: 'X-Robots-Tag',
    value: 'noindex, nofollow, noarchive',
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

const privateRouteHeaders = [
  {
    key: 'Cache-Control',
    value: 'no-store, max-age=0',
  },
];

// Content Security Policy is added with per-request nonces in the Admin proxy.
// A static unsafe-inline policy would weaken protection for privileged sessions.
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
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [...sharedSecurityHeaders, ...productionSecurityHeaders],
      },
      {
        source: '/dashboard/:path*',
        headers: privateRouteHeaders,
      },
      {
        source: '/login',
        headers: privateRouteHeaders,
      },
    ];
  },
};

export default nextConfig;
