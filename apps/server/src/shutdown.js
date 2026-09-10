/**
 * @typedef {object} ShutdownApp
 * @property {() => Promise<void>} close
 * @property {{ info: (...args: any[]) => void, error: (...args: any[]) => void }} log
 */

function createShutdownTimeoutError(gracePeriodMs) {
  return Object.assign(new Error(`Graceful shutdown exceeded ${gracePeriodMs}ms.`), {
    code: 'SHUTDOWN_TIMEOUT',
  });
}

/**
 * @param {{
 *   app: ShutdownApp,
 *   readinessState?: { markDraining: () => void },
 *   gracePeriodMs?: number,
 *   exitImpl?: (code: number) => void,
 * }} options
 */
export function createShutdownHandler({
  app,
  readinessState,
  gracePeriodMs = 25_000,
  exitImpl = (code) => process.exit(code),
}) {
  if (!Number.isInteger(gracePeriodMs) || gracePeriodMs < 1) {
    throw new TypeError('Shutdown grace period must be a positive integer.');
  }

  /** @type {Promise<void> | null} */
  let shutdownPromise = null;

  return function shutdown(signal) {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      app.log.info({ signal }, 'Graceful shutdown started');

      /** @type {ReturnType<typeof setTimeout> | undefined} */
      let timeout;

      try {
        // Stop advertising readiness before close() begins draining in-flight
        // work, so an orchestrator can remove this instance from new traffic.
        readinessState?.markDraining();

        const closePromise = app.close();
        const timeoutPromise = new Promise((_, reject) => {
          timeout = setTimeout(() => reject(createShutdownTimeoutError(gracePeriodMs)), gracePeriodMs);
        });

        await Promise.race([closePromise, timeoutPromise]);
        exitImpl(0);
      } catch (error) {
        app.log.error({ err: error }, 'Graceful shutdown failed');
        exitImpl(1);
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
      }
    })();

    return shutdownPromise;
  };
}
