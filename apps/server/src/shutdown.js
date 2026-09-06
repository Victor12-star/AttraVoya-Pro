export function createShutdownHandler({ app, exitImpl = process.exit }) {
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
