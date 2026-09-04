const siteUrl = process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL || 'http://localhost:3000';

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
];

export default function sitemap() {
  return publicRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
