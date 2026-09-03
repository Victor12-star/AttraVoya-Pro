export function createWeatherController(service) {
  return {
    async forecast(request, reply) {
      const weather = await service.getForecast(request.query);
      reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
      return reply.send({ weather });
    },
  };
}
