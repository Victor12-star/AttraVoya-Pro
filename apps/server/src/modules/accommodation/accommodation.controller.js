export function createAccommodationController(service) {
  return {
    async nearby(request, reply) {
      const accommodation = await service.searchNearby(request.query);
      reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
      return reply.send({ accommodation });
    },
  };
}
