export function createHealthController(service) {
  return {
    async liveness(_request, reply) {
      return reply.send(service.getLiveness());
    },

    async readiness(_request, reply) {
      const result = await service.getReadiness();
      return reply.send(result);
    },
  };
}
