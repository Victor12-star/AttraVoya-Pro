import { MAX_PUBLIC_LANGUAGE_RECORDS } from './languages.contracts.js';

export function createLanguagesRepository(prismaClient) {
  return {
    async list() {
      const client = prismaClient ?? (await import('@attravoya/database')).prisma;

      return client.language.findMany({
        orderBy: [{ isUiSupported: 'desc' }, { name: 'asc' }, { code: 'asc' }, { id: 'asc' }],
        take: MAX_PUBLIC_LANGUAGE_RECORDS,
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
