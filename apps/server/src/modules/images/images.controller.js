export function createImagesController(service) {
  return {
    async search(request, reply) {
      const result = await service.search(request.query);
      reply.header(
        'Cache-Control',
        'public, max-age=3600, stale-while-revalidate=86400',
      );
      return reply.send({ images: result });
    },
  };
}
