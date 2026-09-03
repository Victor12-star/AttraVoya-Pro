import { DEFAULT_UI_LOCALE, normalizeLocale } from '@attravoya/localization';

/**
 * Load maintained interface messages for one supported UI locale.
 *
 * Travel translation (for user-entered phrases) is intentionally separate and
 * will use TranslationProvider/LibreTranslate. Navigation and application copy
 * must stay deterministic, cacheable and SEO-friendly.
 */
export async function loadMessages(locale = DEFAULT_UI_LOCALE) {
  const normalizedLocale = normalizeLocale(locale);

  try {
    return (await import(`../../messages/${normalizedLocale}.json`, { with: { type: 'json' } })).default;
  } catch {
    // English is the source locale and is always required by translation checks.
    return (await import('../../messages/en.json', { with: { type: 'json' } })).default;
  }
}
