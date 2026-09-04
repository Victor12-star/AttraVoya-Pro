function stringOrNull(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function stringArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
  }
  const single = stringOrNull(value);
  return single ? [single] : [];
}

function finiteNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeNewsDataArticle(article) {
  return {
    provider: 'newsdata',
    externalId: stringOrNull(article?.article_id),
    title: stringOrNull(article?.title),
    description: stringOrNull(article?.description),
    url: stringOrNull(article?.link),
    imageUrl: stringOrNull(article?.image_url),
    videoUrl: stringOrNull(article?.video_url),
    publishedAt: stringOrNull(article?.pubDate),
    publishedTimezone: stringOrNull(article?.pubDateTZ),
    language: stringOrNull(article?.language),
    countries: stringArray(article?.country),
    categories: stringArray(article?.category),
    keywords: stringArray(article?.keywords),
    creators: stringArray(article?.creator),
    duplicate: Boolean(article?.duplicate),
    source: {
      externalId: stringOrNull(article?.source_id),
      name: stringOrNull(article?.source_name),
      url: stringOrNull(article?.source_url),
      iconUrl: stringOrNull(article?.source_icon),
      priority: finiteNumberOrNull(article?.source_priority),
    },
  };
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
    articles: results.map(normalizeNewsDataArticle),
    page: {
      totalResults: Number.isInteger(payload.totalResults) ? payload.totalResults : results.length,
      nextPage: stringOrNull(payload.nextPage),
    },
  };
}
