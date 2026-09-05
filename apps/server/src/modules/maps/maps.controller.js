export function createMapsController(service) {
  return {
    async route(request, reply) {
      const route = await service.getRoute(request.query);
      reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return reply.send({ route });
    },
  };
}
