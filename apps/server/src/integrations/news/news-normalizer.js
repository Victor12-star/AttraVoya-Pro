function stringOrNull(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function safeHttpUrl(value) {
  const candidate = stringOrNull(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    // Do not expose embedded URL credentials or local-only links to travellers.
    if (url.username || url.password || url.hostname === 'localhost') return null;
    return url.href;
  } catch {
    return null;
  }
}

function stringArray(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim());
  }
  const single = stringOrNull(value);
  return single ? [single] : [];
}

function finiteNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedUtcPublication(article) {
  if (stringOrNull(article?.pubDateTZ)?.toUpperCase() !== 'UTC') return null;
  const value = stringOrNull(article?.pubDate);
  if (!value || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return null;

  const timestamp = `${value.replace(' ', 'T')}Z`;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;

  // Reject silently rolled-over dates such as February 30.
  return date.toISOString() === timestamp.replace('Z', '.000Z') ? date.toISOString() : null;
}

export function normalizeNewsDataArticle(article) {
  return {
    provider: 'newsdata',
    externalId: stringOrNull(article?.article_id),
    title: stringOrNull(article?.title),
    description: stringOrNull(article?.description),
    url: safeHttpUrl(article?.link),
    imageUrl: safeHttpUrl(article?.image_url),
    videoUrl: safeHttpUrl(article?.video_url),
    publishedAt: stringOrNull(article?.pubDate),
    publishedTimezone: stringOrNull(article?.pubDateTZ),
    publishedAtUtc: normalizedUtcPublication(article),
    language: stringOrNull(article?.language),
    countries: stringArray(article?.country),
    categories: stringArray(article?.category),
    keywords: stringArray(article?.keywords),
    creators: stringArray(article?.creator),
    duplicate: Boolean(article?.duplicate),
    source: {
      externalId: stringOrNull(article?.source_id),
      name: stringOrNull(article?.source_name),
      url: safeHttpUrl(article?.source_url),
      iconUrl: safeHttpUrl(article?.source_icon),
      priority: finiteNumberOrNull(article?.source_priority),
    },
  };
}

function deduplicateArticles(articles) {
  const seenIds = new Set();
  const seenUrls = new Set();

  return articles.filter((article) => {
    if (article.duplicate) return false;
    if (article.externalId && seenIds.has(article.externalId)) return false;
    if (article.url && seenUrls.has(article.url)) return false;

    if (article.externalId) seenIds.add(article.externalId);
    if (article.url) seenUrls.add(article.url);
    return true;
  });
}

function publicationRecency(article, fetchedAt) {
  if (!article.publishedAtUtc) return 'unknown';

  const fetchedTime = Date.parse(fetchedAt);
  const publishedTime = Date.parse(article.publishedAtUtc);
  if (!Number.isFinite(fetchedTime) || !Number.isFinite(publishedTime)) return 'unknown';

  const ageMs = fetchedTime - publishedTime;
  if (ageMs < 0) return 'unknown';
  return ageMs <= 48 * 60 * 60 * 1000 ? 'within_48_hours' : 'older';
}

export function normalizeNewsDataResponse(payload, fetchedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('NewsData payload must be an object.');
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  return {
    provider: 'newsdata',
    fetchedAt,
    endpoint: 'latest',
    // NewsData's free development tier can be delayed. Never label these
    // articles as guaranteed real-time or breaking news in the product UI.
    realtimeGuaranteed: false,
    articles: deduplicateArticles(results.map(normalizeNewsDataArticle)).map((article) => ({
      ...article,
      publicationRecency: publicationRecency(article, fetchedAt),
    })),
    page: {
      totalResults: Number.isInteger(payload.totalResults) ? payload.totalResults : results.length,
      nextPage: stringOrNull(payload.nextPage),
    },
  };
}
