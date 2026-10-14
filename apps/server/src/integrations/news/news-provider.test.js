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
  it('does not treat unrelated recent news as recent destination coverage', () => {
    const fetchedAt = '2026-10-14T12:00:00.000Z';
    const recent = { pubDate: '2026-10-13 12:00:00', pubDateTZ: 'UTC' };
    const unrelated = normalizeNewsDataResponse(
      { results: [{ article_id: 'unrelated', country: ['norway'], ...recent }] },
      fetchedAt,
      'SE',
    );
    expect(unrelated.freshnessStatus).toBe('recent_articles_present');
    expect(unrelated.destinationFreshnessStatus).toBe('no_confirmed_recent_destination_articles');
    const matching = normalizeNewsDataResponse(
      { results: [{ article_id: 'matching', country: ['sweden'], ...recent }] },
      fetchedAt,
      'SE',
    );
    expect(matching.destinationFreshnessStatus).toBe('recent_destination_articles_present');
    const empty = normalizeNewsDataResponse({ results: [] }, fetchedAt, 'SE');
    expect(empty.destinationFreshnessStatus).toBe('no_confirmed_recent_destination_articles');
  });

  it('summarizes attribution without claiming independent fact verification', () => {
    const result = normalizeNewsDataResponse({
      results: [
        { article_id: 'linked', source_name: 'Publisher', link: 'https://example.test/story' },
        { article_id: 'named', source_name: 'Publisher' },
        { article_id: 'unknown' },
      ],
    });
    expect(result.attributionBreakdown).toEqual({
      namedAndLinked: 1,
      namedOnly: 1,
      unavailable: 1,
    });
    const empty = normalizeNewsDataResponse({ results: [] });
    expect(empty.attributionBreakdown).toEqual({
      namedAndLinked: 0,
      namedOnly: 0,
      unavailable: 0,
    });
  });

  it('discloses when no article has a confirmed recent publication time', () => {
    const fetchedAt = '2026-10-14T12:00:00.000Z';
    const recent = normalizeNewsDataResponse(
      { results: [{ article_id: 'recent', pubDate: '2026-10-13 12:00:00', pubDateTZ: 'UTC' }] },
      fetchedAt,
    );
    const older = normalizeNewsDataResponse(
      { results: [{ article_id: 'old', pubDate: '2026-10-10 12:00:00', pubDateTZ: 'UTC' }] },
      fetchedAt,
    );
    const unknown = normalizeNewsDataResponse({ results: [{ article_id: 'unknown' }] });
    const empty = normalizeNewsDataResponse({ results: [] });

    expect(recent.freshnessStatus).toBe('recent_articles_present');
    expect(older.freshnessStatus).toBe('no_confirmed_recent_articles');
    expect(unknown.freshnessStatus).toBe('no_confirmed_recent_articles');
    expect(empty.freshnessStatus).toBe('no_confirmed_recent_articles');
    expect(recent.realtimeGuaranteed).toBe(false);
  });

  it('summarizes country relevance without implying a destination is safe', () => {
    const result = normalizeNewsDataResponse(
      {
        results: [
          { article_id: 'match', country: ['sweden'] },
          { article_id: 'other', country: ['norway'] },
          { article_id: 'missing' },
        ],
      },
      '2026-10-14T12:00:00.000Z',
      'SE',
    );
    expect(result.countryRelevanceBreakdown).toEqual({
      countryMatch: 1,
      countryNotListed: 1,
      unknown: 1,
    });
    const empty = normalizeNewsDataResponse({ results: [] });
    expect(empty.countryRelevanceBreakdown).toEqual({
      countryMatch: 0,
      countryNotListed: 0,
      unknown: 0,
    });
  });

  it('summarizes publication recency without claiming real-time reporting', () => {
    const response = normalizeNewsDataResponse(
      {
        results: [
          { article_id: 'recent', pubDate: '2026-10-13 12:00:00', pubDateTZ: 'UTC' },
          { article_id: 'older', pubDate: '2026-10-09 12:00:00', pubDateTZ: 'UTC' },
          { article_id: 'unknown' },
        ],
      },
      '2026-10-14T12:00:00.000Z',
    );

    expect(response.publicationBreakdown).toEqual({
      within48Hours: 1,
      older: 1,
      unknown: 1,
    });
    expect(normalizeNewsDataResponse({ results: [] }).publicationBreakdown).toEqual({
      within48Hours: 0,
      older: 0,
      unknown: 0,
    });
    expect(response.realtimeGuaranteed).toBe(false);
  });

  it('distinguishes empty news coverage without implying destination safety', () => {
    const empty = normalizeNewsDataResponse({ results: [] });
    const populated = normalizeNewsDataResponse({
      results: [{ article_id: 'one', title: 'Travel update' }],
    });
    const duplicatesOnly = normalizeNewsDataResponse({
      results: [{ article_id: 'duplicate', duplicate: true }],
    });

    expect(empty.coverageStatus).toBe('no_articles_returned');
    expect(duplicatesOnly.coverageStatus).toBe('no_articles_returned');
    expect(populated.coverageStatus).toBe('articles_returned');
    expect(empty.realtimeGuaranteed).toBe(false);
  });

  it('rejects expanded IPv6 loopback and unspecified hosts', () => {
    const result = normalizeNewsDataResponse({
      results: [
        { article_id: 'loopback', link: 'http://[0:0:0:0:0:0:0:1]/story' },
        { article_id: 'unspecified', link: 'http://[0:0:0:0:0:0:0:0]/story' },
        { article_id: 'public', link: 'https://example.test/story' },
      ],
    });
    const urls = result.articles.map((article) => article.url);
    expect(urls).toEqual([null, null, 'https://example.test/story']);
  });

  it('rejects local hosts with trailing DNS dots', () => {
    const links = [
      'http://localhost./story',
      'https://news.local./story',
      'https://intranet./story',
      'http://127.0.0.1./story',
      'https://example.test./story',
    ];
    const result = normalizeNewsDataResponse({
      results: links.map((link, index) => ({ article_id: String(index), link })),
    });
    const articleUrls = result.articles.map((article) => article.url);
    expect(articleUrls).toEqual([null, null, null, null, 'https://example.test./story']);
  });

  it('rejects intranet-only hostnames while retaining public news domains', () => {
    const links = [
      'http://intranet/article',
      'https://newsroom/story',
      'https://example.test/story',
    ];
    const result = normalizeNewsDataResponse({
      results: links.map((link, index) => ({ article_id: String(index), link })),
    });

    const articleUrls = result.articles.map((article) => article.url);
    expect(articleUrls).toEqual([null, null, 'https://example.test/story']);
  });

  it('rejects reserved and documentation IPv4 news links but retains public links', () => {
    const urls = [
      'http://192.0.0.1/article',
      'http://192.0.2.1/article',
      'http://198.18.0.1/article',
      'http://198.19.255.1/article',
      'http://198.51.100.5/article',
      'http://203.0.113.8/article',
      'https://8.8.8.8/article',
    ];
    const result = normalizeNewsDataResponse({
      results: urls.map((link, index) => ({ article_id: String(index), link })),
    });

    expect(result.articles.map((article) => article.url)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      'https://8.8.8.8/article',
    ]);
  });

  it('labels destination country relevance without treating unlisted countries as unsafe', () => {
    const result = normalizeNewsDataResponse(
      {
        results: [
          { article_id: 'country-name', country: ['sweden'] },
          { article_id: 'country-code', country: ['SE'] },
          { article_id: 'other', country: ['norway'] },
          { article_id: 'missing' },
        ],
      },
      '2026-10-13T12:00:00.000Z',
      'SE',
    );

    expect(result.articles.map((article) => article.countryRelevance)).toEqual([
      'country_match',
      'country_match',
      'country_not_listed',
      'unknown',
    ]);
    const withoutCountry = normalizeNewsDataResponse({
      results: [{ article_id: 'a', country: ['sweden'] }],
    });
    expect(withoutCountry.articles[0].countryRelevance).toBe('unknown');
  });

  it('reports source attribution completeness without calling sources verified', () => {
    const result = normalizeNewsDataResponse({
      results: [
        { article_id: 'full', source_name: 'Example News', link: 'https://example.test/story' },
        { article_id: 'named', source_name: 'Example News', link: 'javascript:alert(1)' },
        { article_id: 'unnamed', link: 'https://example.test/other' },
        { article_id: 'none' },
      ],
    });

    expect(result.articles.map((article) => article.sourceAttributionStatus)).toEqual([
      'named_source_and_article_link',
      'named_source_only',
      'source_unavailable',
      'source_unavailable',
    ]);
    expect(result.realtimeGuaranteed).toBe(false);
  });

  it('rejects private network and loopback article links', () => {
    const links = [
      'http://127.0.0.1/article',
      'http://10.0.0.1/article',
      'http://172.16.0.1/article',
      'http://192.168.1.3/article',
      'http://169.254.1.1/article',
      'http://[::1]/article',
      'https://news.local/article',
      'https://example.localhost/article',
      'https://example.test/article',
    ];
    const result = normalizeNewsDataResponse({
      results: links.map((link, index) => ({ article_id: String(index), link })),
    });

    expect(result.articles.map((article) => article.url)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'https://example.test/article',
    ]);
  });

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
