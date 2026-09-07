import {
  PHRASEBOOK_CATEGORIES,
  PHRASEBOOK_SOURCE_LANGUAGE,
} from './phrasebook.contracts.js';

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

export function createPhrasebookService(provider, repository) {
  return {
    async getCatalog({ countryCode }) {
      const [providerLanguages, destinationCountry] = await Promise.all([
        provider.getLanguages(),
        repository.findCountryByIso2(countryCode),
      ]);
      const languages = Array.isArray(providerLanguages?.languages)
        ? providerLanguages.languages
        : [];
      const english = languages.find(
        (language) =>
          baseLanguageCode(language.code) === PHRASEBOOK_SOURCE_LANGUAGE,
      );
      const supportedTargets = new Set(
        (Array.isArray(english?.targets) ? english.targets : []).map(
          baseLanguageCode,
        ),
      );
      const providerLanguageByCode = new Map(
        languages.map((language) => [
          baseLanguageCode(language.code),
          language,
        ]),
      );

      const seenDestinationLanguages = new Set();
      const destinationLanguages = (Array.isArray(destinationCountry?.languages)
        ? destinationCountry.languages
        : []
      )
        .map((countryLanguage) => {
          const language = countryLanguage?.language;
          const code = baseLanguageCode(language?.code);
          if (!code || seenDestinationLanguages.has(code)) return null;
          seenDestinationLanguages.add(code);
          return {
            code,
            name:
              language?.name ?? providerLanguageByCode.get(code)?.name ?? code,
            nativeName: language?.nativeName ?? language?.name ?? code,
            direction: language?.direction ?? 'ltr',
            isOfficial: countryLanguage?.isOfficial === true,
            isCommon: countryLanguage?.isCommon === true,
            available: supportedTargets.has(code),
          };
        })
        .filter(Boolean);

      const availableTargetLanguages = unique([...supportedTargets])
        .filter((code) => code !== PHRASEBOOK_SOURCE_LANGUAGE)
        .map((code) => ({
          code,
          name: providerLanguageByCode.get(code)?.name ?? code,
        }))
        .sort((left, right) =>
          left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }),
        );

      return {
        sourceLanguage: { code: PHRASEBOOK_SOURCE_LANGUAGE, name: 'English' },
        destination: {
          countryCode,
          countryName: destinationCountry?.name ?? countryCode,
          knownCountry: Boolean(destinationCountry),
          languages: destinationLanguages,
          preferredTargetLanguage:
            destinationLanguages.find((language) => language.available)?.code ??
            null,
        },
        provider: {
          name:
            providerLanguages?.provider ??
            provider.name ??
            'translation-provider',
          fetchedAt: providerLanguages?.fetchedAt ?? null,
        },
        availableTargetLanguages,
        categories: PHRASEBOOK_CATEGORIES,
      };
    },
  };
}
