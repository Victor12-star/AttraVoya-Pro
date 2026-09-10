import { afterEach, describe, expect, it, vi } from 'vitest';

import { createShutdownHandler } from './shutdown.js';

/**
 * @returns {{ promise: Promise<void>, resolve: (value: void | PromiseLike<void>) => void }}
 */
function deferredVoid() {
  /** @type {(value: void | PromiseLike<void>) => void} */
  let resolve = () => {};
  /** @type {Promise<void>} */
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('shutdown handler', () => {
  it('coalesces repeated shutdown signals into one close operation', async () => {
    const gate = deferredVoid();
    const readinessState = {
      markDraining: vi.fn(),
    };
    const app = {
      close: vi.fn().mockImplementation(async () => gate.promise),
      log: {
        info: vi.fn(),
        error: vi.fn(),
      },
    };
    const exitImpl = vi.fn();
    const shutdown = createShutdownHandler({ app, readinessState, exitImpl });

    const first = shutdown('SIGTERM');
    const second = shutdown('SIGINT');

    expect(second).toBe(first);
    expect(readinessState.markDraining).toHaveBeenCalledTimes(1);
    expect(app.close).toHaveBeenCalledTimes(1);

    gate.resolve(undefined);
    await first;

    expect(exitImpl).toHaveBeenCalledTimes(1);
    expect(exitImpl).toHaveBeenCalledWith(0);
  });

  it('marks the instance draining before graceful close starts', async () => {
    const order = [];
    const readinessState = {
      markDraining: vi.fn(() => {
        order.push('draining');
      }),
    };
    const app = {
      close: vi.fn().mockImplementation(async () => {
        order.push('close');
      }),
      log: {
        info: vi.fn(),
        error: vi.fn(),
      },
    };
    const exitImpl = vi.fn();
    const shutdown = createShutdownHandler({ app, readinessState, exitImpl });

    await shutdown('SIGTERM');

    expect(order).toEqual(['draining', 'close']);
    expect(exitImpl).toHaveBeenCalledWith(0);
  });

  it('exits unsuccessfully when graceful close fails', async () => {
    const closeError = new Error('close failed');
    const app = {
      close: vi.fn().mockRejectedValue(closeError),
      log: {
        info: vi.fn(),
        error: vi.fn(),
      },
    };
    const exitImpl = vi.fn();
    const shutdown = createShutdownHandler({ app, exitImpl });

    await shutdown('SIGTERM');

    expect(app.log.error).toHaveBeenCalledWith({ err: closeError }, 'Graceful shutdown failed');
    expect(exitImpl).toHaveBeenCalledWith(1);
  });

  it('fails closed when graceful draining exceeds its configured deadline', async () => {
    vi.useFakeTimers();
    const gate = deferredVoid();
    const app = {
      close: vi.fn().mockImplementation(async () => gate.promise),
      log: {
        info: vi.fn(),
        error: vi.fn(),
      },
    };
    const exitImpl = vi.fn();
    const shutdown = createShutdownHandler({ app, gracePeriodMs: 1000, exitImpl });

    const result = shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(1000);
    await result;

    expect(exitImpl).toHaveBeenCalledTimes(1);
    expect(exitImpl).toHaveBeenCalledWith(1);
    expect(app.log.error).toHaveBeenCalledWith(
      {
        err: expect.objectContaining({
          code: 'SHUTDOWN_TIMEOUT',
          message: 'Graceful shutdown exceeded 1000ms.',
        }),
      },
      'Graceful shutdown failed',
    );

    gate.resolve(undefined);
  });

  it('rejects an invalid shutdown grace period at startup', () => {
    const app = {
      close: vi.fn(),
      log: {
        info: vi.fn(),
        error: vi.fn(),
      },
    };

    expect(() => createShutdownHandler({ app, gracePeriodMs: 0 })).toThrow(
      'Shutdown grace period must be a positive integer.',
    );
  });
});
