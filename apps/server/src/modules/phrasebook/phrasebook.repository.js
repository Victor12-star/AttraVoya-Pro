export function createPhrasebookRepository() {
  return {
    async findCountryByIso2(countryCode) {
      const { prisma } = await import('@attravoya/database');
      return prisma.country.findUnique({
        where: { iso2: countryCode },
        select: {
          iso2: true,
          name: true,
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
                },
              },
            },
          },
        },
      });
    },
  };
}
