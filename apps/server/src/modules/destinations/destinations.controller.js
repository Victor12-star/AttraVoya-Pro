export function createDestinationsController(service, overviewService) {
  return {
    async search(request, reply) {
      const destinations = await service.search(request.query);
      reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return reply.send({ destinations });
    },

    async overview(request, reply) {
      const overview = await overviewService.getOverview(request.query);
      // Overview sections have different provider freshness windows. Keep the
      // aggregate cache short so stale weather is not retained for too long.
      reply.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
      return reply.send({ overview });
    },
  };
}
