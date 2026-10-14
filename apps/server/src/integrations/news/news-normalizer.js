function stringOrNull(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isLocalOrPrivateHost(hostname) {
  // Fully-qualified hostnames may end in a dot; normalize before local-host checks.
  const host = hostname.toLowerCase().replace(/\.+$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  // Bare intranet names should not be offered as public article links.
  if (!host.includes('.') && !host.startsWith('[')) return true;
  if (host.startsWith('[') && host.endsWith(']')) {
    const address = host.slice(1, -1);
    return (
      address === '::1' ||
      address === '0:0:0:0:0:0:0:1' ||
      address === '0:0:0:0:0:0:0:0' ||
      address === '::' ||
      address.startsWith('fc') ||
      address.startsWith('fd') ||
      /^fe[89ab]/.test(address) ||
      address.startsWith('::ffff:')
    );
  }

  const octets = host.split('.');
  if (octets.length !== 4 || !octets.every((item) => /^\d{1,3}$/.test(item))) return false;
  const [first, second, third] = octets.map(Number);
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && (third === 0 || third === 2)) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function safeHttpUrl(value) {
  const candidate = stringOrNull(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    // Do not expose embedded URL credentials or local-only links to travellers.
    if (url.username || url.password || isLocalOrPrivateHost(url.hostname)) return null;
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

function sourceAttributionStatus(article) {
  if (article.source.name && article.url) return 'named_source_and_article_link';
  if (article.source.name) return 'named_source_only';
  return 'source_unavailable';
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

function countryRelevance(article, countryCode) {
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) return 'unknown';
  if (!article.countries.length) return 'unknown';

  const requestedCode = countryCode.toLowerCase();
  const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const requestedName = displayNames.of(countryCode.toUpperCase())?.toLowerCase();

  const matchesCountry = article.countries.some((country) => {
    const normalized = country.toLowerCase();
    return normalized === requestedCode || normalized === requestedName;
  });
  return matchesCountry ? 'country_match' : 'country_not_listed';
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

export function normalizeNewsDataResponse(
  payload,
  fetchedAt = new Date().toISOString(),
  countryCode,
) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('NewsData payload must be an object.');
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  const articles = deduplicateArticles(results.map(normalizeNewsDataArticle)).map((article) => ({
    ...article,
    publicationRecency: publicationRecency(article, fetchedAt),
    sourceAttributionStatus: sourceAttributionStatus(article),
    countryRelevance: countryRelevance(article, countryCode),
  }));
  const publicationBreakdown = { within48Hours: 0, older: 0, unknown: 0 };
  for (const article of articles) {
    if (article.publicationRecency === 'within_48_hours') publicationBreakdown.within48Hours += 1;
    else if (article.publicationRecency === 'older') publicationBreakdown.older += 1;
    else publicationBreakdown.unknown += 1;
  }
  const countryRelevanceBreakdown = { countryMatch: 0, countryNotListed: 0, unknown: 0 };
  for (const article of articles) {
    if (article.countryRelevance === 'country_match') countryRelevanceBreakdown.countryMatch += 1;
    else if (article.countryRelevance === 'country_not_listed') {
      countryRelevanceBreakdown.countryNotListed += 1;
    } else countryRelevanceBreakdown.unknown += 1;
  }
  const attributionBreakdown = { namedAndLinked: 0, namedOnly: 0, unavailable: 0 };
  for (const article of articles) {
    if (article.sourceAttributionStatus === 'named_source_and_article_link') {
      attributionBreakdown.namedAndLinked += 1;
    } else if (article.sourceAttributionStatus === 'named_source_only') {
      attributionBreakdown.namedOnly += 1;
    } else attributionBreakdown.unavailable += 1;
  }
  // Only destination-matching articles can substantiate recent destination coverage.
  const destinationRecentArticleCount = articles.filter(
    (article) =>
      article.countryRelevance === 'country_match' &&
      article.publicationRecency === 'within_48_hours',
  ).length;
  return {
    provider: 'newsdata',
    fetchedAt,
    endpoint: 'latest',
    // NewsData's free development tier can be delayed. Never label these
    // articles as guaranteed real-time or breaking news in the product UI.
    realtimeGuaranteed: false,
    // An empty feed never establishes that a destination is safe.
    coverageStatus: articles.length > 0 ? 'articles_returned' : 'no_articles_returned',
    publicationBreakdown,
    // Freshness describes published timestamps, not completeness or destination safety.
    freshnessStatus:
      publicationBreakdown.within48Hours > 0
        ? 'recent_articles_present'
        : 'no_confirmed_recent_articles',
    countryRelevanceBreakdown,
    destinationFreshnessStatus:
      destinationRecentArticleCount > 0
        ? 'recent_destination_articles_present'
        : 'no_confirmed_recent_destination_articles',
    attributionBreakdown,
    articles,
    page: {
      totalResults: Number.isInteger(payload.totalResults) ? payload.totalResults : results.length,
      nextPage: stringOrNull(payload.nextPage),
    },
  };
}
