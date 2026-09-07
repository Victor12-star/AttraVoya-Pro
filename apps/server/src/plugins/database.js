import { closeDatabase } from '@attravoya/database';

/**
 * Tie the process-wide Prisma client and externally owned PostgreSQL pool to
 * Fastify's lifecycle so rolling deploys and replica termination explicitly
 * release every database connection.
 *
 * @param {import('fastify').FastifyInstance} app
 * @param {{ closeDatabaseConnection?: () => Promise<void> }} [options]
 */
export function registerDatabaseLifecycle(app, { closeDatabaseConnection = closeDatabase } = {}) {
  app.addHook('onClose', async () => {
    await closeDatabaseConnection();
  });
}
