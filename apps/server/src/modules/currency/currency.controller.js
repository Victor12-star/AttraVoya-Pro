export function createCurrencyController(service) {
  return {
    async rates(request, reply) {
      const currency = await service.getRates(request.query);
      reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=21600');
      return reply.send({ currency });
    },
    async convert(request, reply) {
      const conversion = await service.convert(request.query);
      reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=21600');
      return reply.send({ conversion });
    },
  };
}
