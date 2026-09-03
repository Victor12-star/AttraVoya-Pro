import { env } from './config/env.js';
import { buildApp } from './app.js';

const app = await buildApp();

async function shutdown(signal) {
  app.log.info({ signal }, 'Graceful shutdown started');

  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'Graceful shutdown failed');
    process.exit(1);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

try {
  const address = await app.listen({
    host: env.API_HOST,
    port: env.API_PORT,
  });

  app.log.info({ address }, 'AttraVoya Pro API started');
} catch (error) {
  app.log.fatal({ err: error }, 'AttraVoya Pro API failed to start');
  process.exit(1);
}
