export function createPhrasebookController(service) {
  return {
    async catalog(request, reply) {
      const phrasebook = await service.getCatalog(request.query);
      reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return reply.send({ phrasebook });
    },
  };
}
