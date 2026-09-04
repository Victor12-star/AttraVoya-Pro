export function createNewsController(service) {
  return {
    async search(request, reply) {
      const result = await service.search(request.query);
      reply.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      return reply.send({ news: result });
    },
  };
}
