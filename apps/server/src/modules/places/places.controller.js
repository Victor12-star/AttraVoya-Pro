export function createPlacesController(service) {
  return {
    async autocomplete(request, reply) {
      const places = await service.autocomplete(request.query);
      reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return reply.send({ places });
    },
    async nearby(request, reply) {
      const places = await service.searchNearby(request.query);
      reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
      return reply.send({ places });
    },
  };
}
