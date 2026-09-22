export function createEntitlementsController(service) {
  return {
    async getCurrentAccess(request, reply) {
      const access = await service.getCurrentAccess({ userId: request.auth.id });
      reply.header('Cache-Control', 'private, no-store');
      return reply.code(200).send({ access });
    },
  };
}
