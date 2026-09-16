import { MAX_PUBLIC_EMERGENCY_RECORDS } from './emergency.contracts.js';

export function createEmergencyRepository(prismaClient) {
  return {
    /** @param {string} countryCode */
    async listPublishedVerifiedByCountryCode(countryCode) {
      const client = prismaClient ?? (await import('@attravoya/database')).prisma;

      return client.emergencyRecord.findMany({
        where: {
          country: { iso2: countryCode },
          regionName: null,
          status: 'VERIFIED',
          isPublished: true,
          lastVerifiedAt: { not: null },
        },
        orderBy: [{ service: 'asc' }, { serviceLabel: 'asc' }, { id: 'asc' }],
        take: MAX_PUBLIC_EMERGENCY_RECORDS,
        select: {
          id: true,
          regionName: true,
          service: true,
          serviceLabel: true,
          phoneNumber: true,
          sourceName: true,
          sourceUrl: true,
          status: true,
          lastVerifiedAt: true,
          isPublished: true,
          country: {
            select: {
              iso2: true,
            },
          },
        },
      });
    },
  };
}
