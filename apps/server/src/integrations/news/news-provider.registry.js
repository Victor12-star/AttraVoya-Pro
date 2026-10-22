import { createUnavailableProvider } from '../http/unavailable-provider.js';
import { createNewsDataNewsProvider } from './newsdata-news-provider.js';

export const NEWS_PROVIDER_REGISTRY = Object.freeze({
  none: () => createUnavailableProvider('news', ['searchNews']),
  newsdata: createNewsDataNewsProvider,
});
