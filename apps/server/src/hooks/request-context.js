/**
 * Return the server-generated request ID to callers so frontend error reports
 * can be matched with backend logs without exposing implementation details.
 */
export async function registerRequestContext(app) {
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
}
