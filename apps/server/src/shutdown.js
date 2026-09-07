/**
 * @typedef {object} ShutdownApp
 * @property {() => Promise<void>} close
 * @property {{ info: (...args: any[]) => void, error: (...args: any[]) => void }} log
 */

/**
 * @param {{
 *   app: ShutdownApp,
 *   readinessState?: { markDraining: () => void },
 *   exitImpl?: (code: number) => void,
 * }} options
 */
export function createShutdownHandler({
  app,
  readinessState,
  exitImpl = (code) => process.exit(code),
}) {
  /** @type {Promise<void> | null} */
  let shutdownPromise = null;

  return function shutdown(signal) {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      app.log.info({ signal }, 'Graceful shutdown started');

      try {
        // Stop advertising readiness before close() begins draining in-flight
        // work, so an orchestrator can remove this instance from new traffic.
        readinessState?.markDraining();
        await app.close();
        exitImpl(0);
      } catch (error) {
        app.log.error({ err: error }, 'Graceful shutdown failed');
        exitImpl(1);
      }
    })();

    return shutdownPromise;
  };
}
