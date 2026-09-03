export function createHealthRepository() {
  return {
    async checkDatabase() {
      // Import lazily so liveness checks and isolated tests can construct the
      // API without opening a PostgreSQL connection until readiness is tested.
      const { prisma } = await import('@attravoya/database');
      await prisma.$queryRaw`SELECT 1`;
      return true;
    },
  };
}
