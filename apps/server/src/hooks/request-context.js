import { runWithRequestContext } from '../observability/request-context.js';

/**
 * Return the server-generated request ID to callers so frontend error reports
 * can be matched with backend logs without exposing implementation details.
 * The same server-generated UUID is also kept in async-local context so
 * downstream provider requests can carry a privacy-safe correlation header.
 */
export async function registerRequestContext(app) {
  app.addHook('onRequest', (request, reply, done) => {
    runWithRequestContext(request.id, () => {
      reply.header('x-request-id', request.id);
      done();
    });
  });
}
