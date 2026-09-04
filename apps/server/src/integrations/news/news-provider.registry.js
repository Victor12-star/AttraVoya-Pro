import { createNewsDataNewsProvider } from './newsdata-news-provider.js';

export const NEWS_PROVIDER_REGISTRY = Object.freeze({
  newsdata: createNewsDataNewsProvider,
});
