export function createEmergencyRepository() {
  return {
    /** @param {string} countryCode */
    async listPublishedVerifiedByCountryCode(countryCode) {
      const { prisma } = await import('@attravoya/database');

      return prisma.emergencyRecord.findMany({
        where: {
          country: { iso2: countryCode },
          regionName: null,
          status: 'VERIFIED',
          isPublished: true,
          lastVerifiedAt: { not: null },
        },
        orderBy: [{ service: 'asc' }, { serviceLabel: 'asc' }],
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
