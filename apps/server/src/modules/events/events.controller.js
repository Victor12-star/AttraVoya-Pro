export function createEventsController(service) {
  return {
    async search(request, reply) {
      const result = await service.search(request.query);
      reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
      return reply.send({ events: result });
    },
  };
}
