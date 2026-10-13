import { describe, expect, it, vi } from 'vitest';

import { ProviderAuthenticationError, ProviderResponseError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createNewsDataNewsProvider } from './newsdata-news-provider.js';
import { normalizeNewsDataResponse } from './news-normalizer.js';

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
  it('does not expose embedded credentials or local news links', () => {
    const result = normalizeNewsDataResponse({
      results: [
        {
          article_id: 'credentials',
          link: 'https://user:secret@example.test/story',
          image_url: 'https://user@example.test/image.jpg',
          source_url: 'http://localhost:3000/internal',
        },
        {
          article_id: 'normal',
          link: 'https://example.test/story',
          source_url: 'https://publisher.test/',
        },
      ],
    });

    expect(result.articles[0].url).toBeNull();
    expect(result.articles[0].imageUrl).toBeNull();
    expect(result.articles[0].source.url).toBeNull();
    expect(result.articles[1].url).toBe('https://example.test/story');
    expect(result.articles[1].source.url).toBe('https://publisher.test/');
  });

  it('rejects unsafe and malformed article media and publisher links', () => {
    const result = normalizeNewsDataResponse({
      results: [
        {
          article_id: 'unsafe',
          link: 'javascript:alert(1)',
          image_url: 'data:text/html,unsafe',
          video_url: 'file:///private/media',
          source_url: 'javascript:alert(2)',
          source_icon: '/relative-icon.png',
        },
        {
          article_id: 'safe',
          link: 'https://example.test/travel',
          image_url: 'https://example.test/image.jpg',
          video_url: 'http://example.test/video',
          source_url: 'https://publisher.test/',
          source_icon: 'https://publisher.test/logo.png',
        },
      ],
    });

    expect(result.articles[0].url).toBeNull();
    expect(result.articles[0].imageUrl).toBeNull();
    expect(result.articles[0].videoUrl).toBeNull();
    expect(result.articles[0].source.url).toBeNull();
    expect(result.articles[0].source.iconUrl).toBeNull();
    expect(result.articles[1].url).toBe('https://example.test/travel');
    expect(result.articles[1].imageUrl).toBe('https://example.test/image.jpg');
    expect(result.articles[1].videoUrl).toBe('http://example.test/video');
    expect(result.articles[1].source.url).toBe('https://publisher.test/');
    expect(result.articles[1].source.iconUrl).toBe('https://publisher.test/logo.png');
  });

  it('reports publication recency relative to retrieval without promising live updates', () => {
    const fetchedAt = '2026-10-13T12:00:00.000Z';
    const result = normalizeNewsDataResponse(
      {
        results: [
          { article_id: 'recent', pubDate: '2026-10-12 12:00:00', pubDateTZ: 'UTC' },
          { article_id: 'old', pubDate: '2026-10-09 12:00:00', pubDateTZ: 'UTC' },
          { article_id: 'future', pubDate: '2026-10-14 12:00:00', pubDateTZ: 'UTC' },
          { article_id: 'unverified', pubDate: '2026-10-12 12:00:00' },
        ],
      },
      fetchedAt,
    );

    expect(result.articles.map((article) => article.publicationRecency)).toEqual([
      'within_48_hours',
      'older',
      'unknown',
      'unknown',
    ]);
    expect(result.fetchedAt).toBe(fetchedAt);
    expect(result.realtimeGuaranteed).toBe(false);
  });

  it('normalizes only valid explicitly UTC publication times', async () => {
    const provider = createNewsDataNewsProvider({
      http: {
        requestJson: vi.fn().mockResolvedValue({
          status: 'success',
          results: [
            { article_id: 'valid', pubDate: '2026-10-13 09:30:00', pubDateTZ: 'UTC' },
            { article_id: 'invalid', pubDate: '2026-02-30 09:30:00', pubDateTZ: 'UTC' },
            { article_id: 'unknown-zone', pubDate: '2026-10-13 09:30:00', pubDateTZ: 'CET' },
            { article_id: 'no-zone', pubDate: '2026-10-13 09:30:00' },
          ],
        }),
      },
      apiKey: 'test-key',
      cache: createProviderCache(),
    });

    const result = await provider.searchNews({ countryCode: 'SE' });

    expect(result.articles.map((article) => article.publishedAtUtc)).toEqual([
      '2026-10-13T09:30:00.000Z',
      null,
      null,
      null,
    ]);
    expect(result.articles[1].publishedAt).toBe('2026-02-30 09:30:00');
    expect(result.realtimeGuaranteed).toBe(false);
  });

  it('keeps unique, attributed news and excludes repeated articles', async () => {
    const http = {
      requestJson: vi.fn().mockResolvedValue({
        status: 'success',
        totalResults: 5,
        results: [
          {
            article_id: 'a',
            link: 'https://example.test/a',
            title: 'First',
            pubDate: '2026-10-13 09:00:00',
            source_name: 'Publisher',
          },
          { article_id: 'a', link: 'https://example.test/repeated', title: 'Repeated ID' },
          { article_id: 'b', link: 'https://example.test/a', title: 'Repeated URL' },
          {
            article_id: 'c',
            link: 'https://example.test/c',
            title: 'Provider duplicate',
            duplicate: true,
          },
          { article_id: 'd', link: 'https://example.test/d', title: 'Second' },
        ],
      }),
    };
    const provider = createNewsDataNewsProvider({
      http,
      apiKey: 'test-key',
      cache: createProviderCache(),
    });

    const result = await provider.searchNews({ countryCode: 'SE' });

    expect(result.articles.map((article) => article.title)).toEqual(['First', 'Second']);
    expect(result.articles[0].publishedAt).toBe('2026-10-13 09:00:00');
    expect(result.articles[0].source.name).toBe('Publisher');
    expect(result.page.totalResults).toBe(5);
    expect(result.realtimeGuaranteed).toBe(false);
  });

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
