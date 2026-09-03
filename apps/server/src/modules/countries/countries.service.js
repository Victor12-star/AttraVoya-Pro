export function createCountriesService(repository) {
  return {
    async listCountries() {
      const countries = await repository.list();

      return countries.map((country) => ({
        id: country.id,
        iso2: country.iso2,
        iso3: country.iso3,
        name: country.name,
        callingCode: country.callingCode,
        region: country.region,
        subregion: country.subregion,
        defaultTimeZone: country.defaultTimeZone,
        languages: country.languages.map((entry) => ({
          ...entry.language,
          isOfficial: entry.isOfficial,
          isCommon: entry.isCommon,
          rank: entry.rank,
        })),
        currencies: country.currencies.map((entry) => ({
          ...entry.currency,
          isPrimary: entry.isPrimary,
        })),
      }));
    },
  };
}
