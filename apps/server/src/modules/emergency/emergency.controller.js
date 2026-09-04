const EMERGENCY_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

export function createEmergencyController(service) {
  return {
    async listCountry(request, reply) {
      const emergency = await service.listVerifiedCountryEmergency(request.query.countryCode);
      reply.header('Cache-Control', EMERGENCY_CACHE_CONTROL);
      return reply.send({ emergency });
    },
  };
}
