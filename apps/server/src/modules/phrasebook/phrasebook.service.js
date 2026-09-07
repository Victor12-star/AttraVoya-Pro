import {
  getCountryDisplayName,
  getLanguageDirection,
  getLanguageDisplayName,
  getLanguageNativeName,
  getSuggestedLanguageCodes,
} from '@attravoya/localization';

import { PHRASEBOOK_CATEGORIES, PHRASEBOOK_SOURCE_LANGUAGE } from './phrasebook.contracts.js';

function baseLanguageCode(value) {
  return String(value ?? '')
    .trim()
    .replace('_', '-')
    .toLowerCase()
    .split('-')[0];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function describeLanguage(code, providerName = null) {
  return {
    code,
    name: getLanguageDisplayName(code, 'en') ?? providerName ?? code,
    nativeName: getLanguageNativeName(code) ?? providerName ?? code,
    direction: getLanguageDirection(code),
  };
}

export function createPhrasebookService(provider) {
  return {
    async getCatalog({ countryCode }) {
      const providerLanguages = await provider.getLanguages();
      const languages = Array.isArray(providerLanguages?.languages) ? providerLanguages.languages : [];
      const english = languages.find(
        (language) => baseLanguageCode(language.code) === PHRASEBOOK_SOURCE_LANGUAGE,
      );
      const supportedTargets = new Set(
        (Array.isArray(english?.targets) ? english.targets : []).map(baseLanguageCode),
      );
      const providerLanguageByCode = new Map(
        languages.map((language) => [baseLanguageCode(language.code), language]),
      );

      const destinationLanguageCodes = unique(
        getSuggestedLanguageCodes(countryCode).map(baseLanguageCode),
      );
      const destinationLanguages = destinationLanguageCodes.map((code) => ({
        ...describeLanguage(code, providerLanguageByCode.get(code)?.name),
        available: supportedTargets.has(code),
      }));

      const availableTargetLanguages = unique([...supportedTargets])
        .filter((code) => code !== PHRASEBOOK_SOURCE_LANGUAGE)
        .map((code) => describeLanguage(code, providerLanguageByCode.get(code)?.name))
        .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));

      return {
        sourceLanguage: describeLanguage(PHRASEBOOK_SOURCE_LANGUAGE, 'English'),
        destination: {
          countryCode,
          countryName: getCountryDisplayName(countryCode, 'en') ?? countryCode,
          languages: destinationLanguages,
          preferredTargetLanguage:
            destinationLanguages.find((language) => language.available)?.code ?? null,
        },
        provider: {
          name: providerLanguages?.provider ?? provider.name ?? 'translation-provider',
          fetchedAt: providerLanguages?.fetchedAt ?? null,
        },
        availableTargetLanguages,
        categories: PHRASEBOOK_CATEGORIES,
      };
    },
  };
}
