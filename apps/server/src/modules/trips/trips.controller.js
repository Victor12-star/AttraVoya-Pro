function authenticatedUserId(request) {
  return /** @type {any} */ (request).auth.id;
}

function sendPrivate(reply, payload) {
  reply.header('Cache-Control', 'private, no-store');
  return reply.code(200).send(payload);
}

export function createTripsController(service) {
  return {
    async listOwnedTrips(request, reply) {
      const trips = await service.listOwnedTrips({ userId: authenticatedUserId(request) });
      return sendPrivate(reply, { trips });
    },
    async getCompanionContext(request, reply) {
      const tripContext = await service.getCompanionContext({
        userId: authenticatedUserId(request),
      });
      return sendPrivate(reply, { tripContext });
    },
  };
}
