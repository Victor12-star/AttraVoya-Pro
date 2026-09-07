import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerDatabaseLifecycle } from './database.js';

describe('database lifecycle', () => {
  it('closes the shared Prisma and PostgreSQL pool resources when Fastify closes', async () => {
    const app = Fastify({ logger: false });
    const closeDatabaseConnection = vi.fn().mockResolvedValue(undefined);

    registerDatabaseLifecycle(app, { closeDatabaseConnection });
    await app.ready();
    await app.close();

    expect(closeDatabaseConnection).toHaveBeenCalledTimes(1);
  });
});
