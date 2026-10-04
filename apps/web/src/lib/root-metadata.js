import { resolvePublicSiteUrl } from './public-site-url.js';

export function createRootMetadata(env = process.env) {
  return {
    metadataBase: new URL(resolvePublicSiteUrl(env)),
    title: {
      default: 'AttraVoya Pro',
      template: '%s · AttraVoya Pro',
    },
    description:
      'Budget-aware destination discovery, trip planning, local travel tools and safety support.',
    applicationName: 'AttraVoya Pro',
  };
}
