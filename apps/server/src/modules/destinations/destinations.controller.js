export function createDestinationsController(service) {
  return {
    async search(request, reply) {
      const destinations = await service.search(request.query);
      reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return reply.send({ destinations });
    },
  };
}
