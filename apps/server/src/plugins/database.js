import { prisma } from '@attravoya/database';

/**
 * Tie the process-wide Prisma client to Fastify's lifecycle so rolling deploys
 * and replica termination explicitly release PostgreSQL pool connections.
 */
export function registerDatabaseLifecycle(app, { databaseClient = prisma } = {}) {
  app.addHook('onClose', async () => {
    await databaseClient.$disconnect();
  });
}
