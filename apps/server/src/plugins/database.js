import { prisma } from '@attravoya/database';

/** @typedef {{ $disconnect: () => Promise<void> }} DatabaseLifecycleClient */

/**
 * Tie the process-wide Prisma client to Fastify's lifecycle so rolling deploys
 * and replica termination explicitly release PostgreSQL pool connections.
 *
 * @param {import('fastify').FastifyInstance} app
 * @param {{ databaseClient?: DatabaseLifecycleClient }} [options]
 */
export function registerDatabaseLifecycle(app, { databaseClient = prisma } = {}) {
  app.addHook('onClose', async () => {
    await databaseClient.$disconnect();
  });
}
