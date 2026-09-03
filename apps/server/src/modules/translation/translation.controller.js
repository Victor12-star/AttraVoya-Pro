export function createTranslationController(service) {
  return {
    async translate(request, reply) {
      const translation = await service.translate(request.body);
      // Traveller-entered phrases can be sensitive. Keep them out of browser
      // and intermediary caches even though the local provider is self-hosted.
      reply.header('Cache-Control', 'no-store');
      return reply.send({ translation });
    },
    async languages(_request, reply) {
      const translation = await service.getLanguages();
      reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return reply.send({ translation });
    },
  };
}
