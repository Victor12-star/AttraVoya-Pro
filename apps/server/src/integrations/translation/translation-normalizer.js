export function normalizeLibreTranslateResult(payload, source, target) {
  if (!payload || typeof payload.translatedText !== 'string') {
    throw new TypeError('LibreTranslate returned an invalid translation response.');
  }

  return {
    provider: 'libretranslate',
    fetchedAt: new Date().toISOString(),
    source,
    target,
    translatedText: payload.translatedText,
    detectedLanguage: payload.detectedLanguage
      ? {
          code: payload.detectedLanguage.language ?? null,
          confidence: payload.detectedLanguage.confidence ?? null,
        }
      : null,
  };
}

export function normalizeLibreTranslateLanguages(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map((language) => ({
    code: language.code,
    name: language.name,
    targets: Array.isArray(language.targets) ? language.targets : [],
  })).filter((language) => language.code && language.name);
}
