import { describe, expect, it, vi } from 'vitest';

import { ProviderAuthenticationError, ProviderResponseError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createNewsDataNewsProvider } from './newsdata-news-provider.js';

const payload = {
  status: 'success',
  totalResults: 1,
  nextPage: 'cursor-2',
  results: [
    {
      article_id: 'news-1',
      title: 'Stockholm travel update',
      description: 'A useful update for visitors.',
      link: 'https://example.test/news-1',
      image_url: 'https://example.test/news-1.jpg',
      pubDate: '2026-09-04 09:30:00',
      pubDateTZ: 'UTC',
      source_id: 'example',
      source_name: 'Example News',
      source_url: 'https://example.test',
      source_priority: 12,
      language: 'english',
      country: ['sweden'],
      category: ['tourism'],
      keywords: ['travel'],
      creator: ['Reporter'],
      duplicate: false,
      content: 'Full article text must not be copied into AttraVoya responses.',
    },
  ],
};

describe('NewsData news adapter', () => {
  it('normalizes and caches recent news without exposing full article content', async () => {
    const http = { requestJson: vi.fn().mockResolvedValue(payload) };
    const provider = createNewsDataNewsProvider({
      http,
      apiKey: 'test-key',
      cache: createProviderCache(),
      cacheTtlSeconds: 600,
    });

    const query = {
      query: 'travel',
      countryCode: 'SE',
      language: 'en',
      categories: ['tourism'],
      size: 10,
      page: 'cursor-1',
    };
    const first = await provider.searchNews(query);
    const second = await provider.searchNews(query);

    expect(first.articles).toHaveLength(1);
    expect(first.articles[0].title).toBe('Stockholm travel update');
    expect(first.articles[0].source.name).toBe('Example News');
    expect(first.articles[0].content).toBeUndefined();
    expect(first.realtimeGuaranteed).toBe(false);
    expect(first.page.nextPage).toBe('cursor-2');
    expect(second).toEqual(first);
    expect(http.requestJson).toHaveBeenCalledTimes(1);

    const requestedUrl = http.requestJson.mock.calls[0][0];
    expect(requestedUrl.searchParams.get('q')).toBe('travel');
    expect(requestedUrl.searchParams.get('country')).toBe('se');
    expect(requestedUrl.searchParams.get('language')).toBe('en');
    expect(requestedUrl.searchParams.get('category')).toBe('tourism');
    expect(requestedUrl.searchParams.get('size')).toBe('10');
    expect(requestedUrl.searchParams.get('page')).toBe('cursor-1');
  });

  it('fails before making a request when the API key is missing', async () => {
    const http = { requestJson: vi.fn() };
    const provider = createNewsDataNewsProvider({
      http,
      apiKey: '',
      cache: createProviderCache(),
    });

    await expect(provider.searchNews({ countryCode: 'SE' })).rejects.toBeInstanceOf(
      ProviderAuthenticationError,
    );
    expect(http.requestJson).not.toHaveBeenCalled();
  });

  it('maps an unsuccessful provider payload to a stable provider response error', async () => {
    const provider = createNewsDataNewsProvider({
      http: { requestJson: vi.fn().mockResolvedValue({ status: 'error', message: 'bad request' }) },
      apiKey: 'test-key',
      cache: createProviderCache(),
    });

    await expect(provider.searchNews({ countryCode: 'SE' })).rejects.toBeInstanceOf(
      ProviderResponseError,
    );
  });
});
