export function createAnalyticsController(service) {
  return {
    async getUserRegistrationSummary(request, reply) {
      const summary = await service.getUserRegistrationSummary({
        windowDays: request.query.days,
      });

      reply.header('Cache-Control', 'private, no-store');
      return reply.code(200).send(summary);
    },
  };
}
