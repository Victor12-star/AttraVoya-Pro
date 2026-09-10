import { describe, expect, it, vi } from 'vitest';

import { createRuntimeMetrics } from './runtime-metrics.js';

describe('runtime metrics', () => {
  it('reports bounded aggregate CPU, memory, and event-loop saturation', () => {
    const now = vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(2_000);
    const readCpuUsage = vi
      .fn()
      .mockReturnValueOnce({ user: 100_000, system: 50_000 })
      .mockReturnValueOnce({ user: 200_000, system: 100_000 });
    const readMemoryUsage = vi.fn(() => ({
      rss: 1_000_000,
      heapTotal: 800_000,
      heapUsed: 400_000,
      external: 50_000,
      arrayBuffers: 10_000,
    }));
    const readEventLoopUtilization = vi
      .fn()
      .mockReturnValueOnce({ idle: 100, active: 20, utilization: 1 / 6 })
      .mockReturnValueOnce({ idle: 600, active: 400, utilization: 0.4 });

    const metrics = createRuntimeMetrics({
      now,
      readCpuUsage,
      readMemoryUsage,
      readEventLoopUtilization,
      parallelism: 4,
    });

    expect(metrics.snapshot()).toEqual({
      windowSeconds: 1,
      cpu: {
        userTimeMs: 200,
        systemTimeMs: 100,
        totalTimeMs: 300,
        coreUtilization: 0.3,
        capacityUtilizationRatio: 0.075,
        availableParallelism: 4,
      },
      memory: {
        rssBytes: 1_000_000,
        heapTotalBytes: 800_000,
        heapUsedBytes: 400_000,
        heapUtilizationRatio: 0.5,
        externalBytes: 50_000,
        arrayBuffersBytes: 10_000,
      },
      eventLoop: {
        utilizationRatio: 0.4,
        activeMs: 400,
        idleMs: 600,
      },
    });
    expect(readCpuUsage).toHaveBeenLastCalledWith({ user: 100_000, system: 50_000 });
    expect(readEventLoopUtilization).toHaveBeenLastCalledWith({
      idle: 100,
      active: 20,
      utilization: 1 / 6,
    });
  });

  it('sanitizes invalid readings and rejects invalid capacity configuration', () => {
    const metrics = createRuntimeMetrics({
      now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(5),
      readCpuUsage: vi
        .fn()
        .mockReturnValueOnce({ user: 0, system: 0 })
        .mockReturnValueOnce({ user: Number.NaN, system: -1 }),
      readMemoryUsage: vi.fn(() => ({
        rss: -1,
        heapTotal: 0,
        heapUsed: Number.NaN,
        external: Number.POSITIVE_INFINITY,
        arrayBuffers: -10,
      })),
      readEventLoopUtilization: vi
        .fn()
        .mockReturnValueOnce({ idle: 0, active: 0, utilization: 0 })
        .mockReturnValueOnce({ idle: -1, active: Number.NaN, utilization: 2 }),
      parallelism: 1,
    });

    expect(metrics.snapshot()).toMatchObject({
      windowSeconds: 0,
      cpu: {
        userTimeMs: 0,
        systemTimeMs: 0,
        totalTimeMs: 0,
        coreUtilization: 0,
        capacityUtilizationRatio: 0,
      },
      memory: {
        rssBytes: 0,
        heapTotalBytes: 0,
        heapUsedBytes: 0,
        heapUtilizationRatio: 0,
        externalBytes: 0,
        arrayBuffersBytes: 0,
      },
      eventLoop: { utilizationRatio: 1, activeMs: 0, idleMs: 0 },
    });

    expect(() => createRuntimeMetrics({ parallelism: 0 })).toThrow(
      'parallelism must be a positive integer.',
    );
  });
});
