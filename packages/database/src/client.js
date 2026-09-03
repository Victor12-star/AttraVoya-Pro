// Singleton PrismaClient for the AttraVoya Pro backend.
// A single instance is shared across the Node process to avoid exhausting
// PostgreSQL connection limits during hot reload / serverless warm-ups.
// Prisma 7 connects through the `pg` driver adapter (@prisma/adapter-pg);
// DATABASE_URL is read from the environment (see prisma.config.js).

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Reuse a global slot so hot reload does not spawn duplicate pools.
// The JSDoc cast satisfies the no-emit JS checker (globalThis has no
// index signature), mirroring the official Prisma singleton pattern.
const globalForPrisma =
  /** @type {{ prisma?: import('@prisma/client').PrismaClient }} */ (globalThis);

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
