import { normalizeLibreTranslateLanguages, normalizeLibreTranslateResult } from './translation-normalizer.js';

/**
 * @typedef {object} LibreTranslateProviderOptions
 * @property {{ requestJson: Function }} http
 * @property {string} baseUrl
 * @property {{ get?: Function, set?: Function } | null} [languageCache]
 * @property {number} [languageCacheTtlSeconds]
 */

/** @param {LibreTranslateProviderOptions} options */
export function createLibreTranslateProvider({
  http,
  baseUrl,
  languageCache = null,
  languageCacheTtlSeconds = 3600,
}) {
  const normalizedBaseUrl = String(baseUrl).replace(/\/$/, '');

  return {
    name: 'libretranslate',

    async translate({ text, source = 'auto', target, format = 'text' }) {
      // Do not cache traveller-entered text. Search phrases and emergency
      // communication can be sensitive, and the local service is cheap enough
      // that privacy is more valuable than retaining translation payloads.
      const payload = await http.requestJson(`${normalizedBaseUrl}/translate`, {
        method: 'POST',
        retry: false,
        body: { q: text, source, target, format },
      });
      return normalizeLibreTranslateResult(payload, source, target);
    },

    async getLanguages() {
      const cacheKey = 'languages';
      const cached = languageCache?.get?.(cacheKey);
      if (cached) return cached;
      const payload = await http.requestJson(`${normalizedBaseUrl}/languages`);
      const result = {
        provider: 'libretranslate',
        fetchedAt: new Date().toISOString(),
        languages: normalizeLibreTranslateLanguages(payload),
      };
      return languageCache?.set
        ? languageCache.set(cacheKey, result, languageCacheTtlSeconds)
        : result;
    },
  };
}
