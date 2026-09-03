export function createCountriesRepository() {
  return {
    async list() {
      const { prisma } = await import('@attravoya/database');
      return prisma.country.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          iso2: true,
          iso3: true,
          name: true,
          callingCode: true,
          region: true,
          subregion: true,
          defaultTimeZone: true,
          languages: {
            orderBy: [{ rank: 'asc' }, { language: { name: 'asc' } }],
            select: {
              isOfficial: true,
              isCommon: true,
              rank: true,
              language: {
                select: {
                  code: true,
                  name: true,
                  nativeName: true,
                  direction: true,
                  isUiSupported: true,
                },
              },
            },
          },
          currencies: {
            orderBy: { isPrimary: 'desc' },
            select: {
              isPrimary: true,
              currency: {
                select: {
                  code: true,
                  name: true,
                  symbol: true,
                  decimalDigits: true,
                },
              },
            },
          },
        },
      });
    },
  };
}
