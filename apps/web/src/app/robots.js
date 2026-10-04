import { resolvePublicSiteUrl } from '../lib/public-site-url.js';

export default function robots() {
  const siteUrl = resolvePublicSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/profile',
          '/trips',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
