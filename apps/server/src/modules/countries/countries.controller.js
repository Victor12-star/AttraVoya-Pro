const REFERENCE_CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

export function createCountriesController(service) {
  return {
    async list(_request, reply) {
      const countries = await service.listCountries();
      reply.header('Cache-Control', REFERENCE_CACHE_CONTROL);
      return reply.send({ countries });
    },
  };
}
