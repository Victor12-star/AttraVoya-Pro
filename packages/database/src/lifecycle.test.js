import { describe, expect, it, vi } from 'vitest';

import { createDatabaseCloser } from './lifecycle.js';

describe('database closer', () => {
  it('disconnects Prisma, ends the external pool, and stays single-flight', async () => {
    const calls = [];
    const prismaClient = {
      $disconnect: vi.fn(async () => {
        calls.push('prisma');
      }),
    };
    const pool = {
      end: vi.fn(async () => {
        calls.push('pool');
      }),
    };
    const closeDatabase = createDatabaseCloser({ prismaClient, pool });

    const first = closeDatabase();
    const second = closeDatabase();
    expect(second).toBe(first);

    await first;

    expect(calls).toEqual(['prisma', 'pool']);
    expect(prismaClient.$disconnect).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it('still ends the pool when Prisma disconnect fails', async () => {
    const disconnectError = new Error('disconnect failed');
    const prismaClient = {
      $disconnect: vi.fn().mockRejectedValue(disconnectError),
    };
    const pool = {
      end: vi.fn().mockResolvedValue(undefined),
    };
    const closeDatabase = createDatabaseCloser({ prismaClient, pool });

    await expect(closeDatabase()).rejects.toBe(disconnectError);
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it('validates lifecycle dependencies before registering shutdown work', () => {
    /** @type {any} */
    const invalidPrismaClient = null;
    /** @type {any} */
    const invalidPool = null;

    expect(() =>
      createDatabaseCloser({
        prismaClient: invalidPrismaClient,
        pool: { async end() {} },
      }),
    ).toThrow('Database closer requires a Prisma disconnect function.');
    expect(() =>
      createDatabaseCloser({
        prismaClient: { async $disconnect() {} },
        pool: invalidPool,
      }),
    ).toThrow('Database closer requires a pool end function.');
  });
});
