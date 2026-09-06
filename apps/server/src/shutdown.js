/**
 * @typedef {object} ShutdownApp
 * @property {() => Promise<void>} close
 * @property {{ info: (...args: any[]) => void, error: (...args: any[]) => void }} log
 */

/**
 * @param {{ app: ShutdownApp, exitImpl?: (code: number) => void }} options
 */
export function createShutdownHandler({ app, exitImpl = (code) => process.exit(code) }) {
  /** @type {Promise<void> | null} */
  let shutdownPromise = null;

  return function shutdown(signal) {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      app.log.info({ signal }, 'Graceful shutdown started');

      try {
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
