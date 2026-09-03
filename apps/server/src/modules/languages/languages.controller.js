const REFERENCE_CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

export function createLanguagesController(service) {
  return {
    async list(_request, reply) {
      const languages = await service.listLanguages();
      reply.header('Cache-Control', REFERENCE_CACHE_CONTROL);
      return reply.send({ languages });
    },
  };
}
