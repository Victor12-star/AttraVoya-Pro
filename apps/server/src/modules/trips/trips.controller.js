function authenticatedUserId(request) {
  return /** @type {any} */ (request).auth.id;
}

function sendPrivate(reply, payload) {
  reply.header('Cache-Control', 'private, no-store');
  return reply.code(200).send(payload);
}

export function createTripsController(service) {
  return {
    async getCompanionContext(request, reply) {
      const tripContext = await service.getCompanionContext({
        userId: authenticatedUserId(request),
      });
      return sendPrivate(reply, { tripContext });
    },
  };
}
