import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerDatabaseLifecycle } from './database.js';

describe('database lifecycle', () => {
  it('disconnects the shared database client when Fastify closes', async () => {
    const app = Fastify({ logger: false });
    const databaseClient = {
      $disconnect: vi.fn().mockResolvedValue(undefined),
    };

    registerDatabaseLifecycle(app, { databaseClient });
    await app.ready();
    await app.close();

    expect(databaseClient.$disconnect).toHaveBeenCalledTimes(1);
  });
});
