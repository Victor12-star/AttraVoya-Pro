// The optional Prisma client and internal limit exist only so PostgreSQL CI can
// observe the exact production relation query and compare small versus full
// result sets without mocking Prisma or changing the public route contract.
export function createCountriesRepository(prismaClient) {
  return {
    async list(options = {}) {
      const client = prismaClient ?? (await import('@attravoya/database')).prisma;
      const limit = options.limit;

      return client.country.findMany({
        ...(limit === undefined ? {} : { take: limit }),
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
