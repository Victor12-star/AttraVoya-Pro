import { resolvePublicSiteUrl } from '../lib/public-site-url.js';

const publicRoutes = [
  '/',
  '/explore',
  '/flights',
  '/stays',
  '/things-to-do',
  '/family',
  '/nearby',
  '/safety',
  '/currency',
  '/language',
  '/transport',
  '/plan-by-budget',
  '/delete-account',
  '/privacy',
  '/terms',
];

export default function sitemap() {
  const siteUrl = resolvePublicSiteUrl();

  return publicRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
