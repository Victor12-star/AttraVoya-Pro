export function createLanguagesRepository() {
  return {
    async list() {
      const { prisma } = await import('@attravoya/database');
      return prisma.language.findMany({
        orderBy: [{ isUiSupported: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          nativeName: true,
          direction: true,
          isUiSupported: true,
        },
      });
    },
  };
}
