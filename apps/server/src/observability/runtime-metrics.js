import { availableParallelism } from 'node:os';
import { performance } from 'node:perf_hooks';

/**
 * @typedef {{ user: number, system: number }} CpuUsage
 * @typedef {{ rss: number, heapTotal: number, heapUsed: number, external: number, arrayBuffers: number }} MemoryUsage
 * @typedef {{ idle: number, active: number, utilization: number }} EventLoopUsage
 */

function nonNegative(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function boundedRatio(numerator, denominator) {
  if (!(denominator > 0)) return 0;
  return Math.min(1, Math.max(0, numerator / denominator));
}

/**
 * Build process-local runtime saturation telemetry without retaining request,
 * user, trip, provider, or other application payloads. CPU is reported both as
 * a single-core equivalent and as a ratio of the process's available parallel
 * capacity so operators can distinguish a hot event loop from host-wide load.
 *
 * @param {{
 *   now?: () => number,
 *   readCpuUsage?: (previous?: CpuUsage) => CpuUsage,
 *   readMemoryUsage?: () => MemoryUsage,
 *   readEventLoopUtilization?: (previous?: EventLoopUsage) => EventLoopUsage,
 *   parallelism?: number,
 * }} [options]
 */
export function createRuntimeMetrics(options = {}) {
  const now = options.now ?? (() => performance.now());
  const readCpuUsage = options.readCpuUsage ?? ((previous) => process.cpuUsage(previous));
  const readMemoryUsage = options.readMemoryUsage ?? (() => process.memoryUsage());
  const readEventLoopUtilization =
    options.readEventLoopUtilization ??
    ((previous) => performance.eventLoopUtilization(previous));
  const parallelism = options.parallelism ?? availableParallelism();

  if (typeof now !== 'function') throw new TypeError('now must be a function.');
  if (typeof readCpuUsage !== 'function') {
    throw new TypeError('readCpuUsage must be a function.');
  }
  if (typeof readMemoryUsage !== 'function') {
    throw new TypeError('readMemoryUsage must be a function.');
  }
  if (typeof readEventLoopUtilization !== 'function') {
    throw new TypeError('readEventLoopUtilization must be a function.');
  }
  if (!Number.isInteger(parallelism) || parallelism < 1) {
    throw new RangeError('parallelism must be a positive integer.');
  }

  const startedAtMs = now();
  const startedCpuUsage = readCpuUsage();
  const startedEventLoopUtilization = readEventLoopUtilization();

  return {
    snapshot() {
      const elapsedMs = nonNegative(now() - startedAtMs);
      const cpuUsage = readCpuUsage(startedCpuUsage);
      const memoryUsage = readMemoryUsage();
      const eventLoopUsage = readEventLoopUtilization(startedEventLoopUtilization);

      const userTimeMs = nonNegative(cpuUsage.user) / 1_000;
      const systemTimeMs = nonNegative(cpuUsage.system) / 1_000;
      const totalTimeMs = userTimeMs + systemTimeMs;
      const coreUtilization = elapsedMs > 0 ? totalTimeMs / elapsedMs : 0;

      const rssBytes = nonNegative(memoryUsage.rss);
      const heapTotalBytes = nonNegative(memoryUsage.heapTotal);
      const heapUsedBytes = nonNegative(memoryUsage.heapUsed);
      const externalBytes = nonNegative(memoryUsage.external);
      const arrayBuffersBytes = nonNegative(memoryUsage.arrayBuffers);

      return {
        windowSeconds: elapsedMs / 1_000,
        cpu: {
          userTimeMs,
          systemTimeMs,
          totalTimeMs,
          coreUtilization,
          capacityUtilizationRatio: boundedRatio(coreUtilization, parallelism),
          availableParallelism: parallelism,
        },
        memory: {
          rssBytes,
          heapTotalBytes,
          heapUsedBytes,
          heapUtilizationRatio: boundedRatio(heapUsedBytes, heapTotalBytes),
          externalBytes,
          arrayBuffersBytes,
        },
        eventLoop: {
          utilizationRatio: boundedRatio(nonNegative(eventLoopUsage.utilization), 1),
          activeMs: nonNegative(eventLoopUsage.active),
          idleMs: nonNegative(eventLoopUsage.idle),
        },
      };
    },
  };
}

export const runtimeMetrics = createRuntimeMetrics();
