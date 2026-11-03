export function createAdminInviteController(service) {
  return {
    async invite(request, reply) {
      const result = await service.invite({
        actorId: request.auth.id,
        email: request.body.email,
        currentPassword: request.body.currentPassword,
      });
      reply.header('Cache-Control', 'private, no-store');
      return reply.send(result);
    },
  };
}
