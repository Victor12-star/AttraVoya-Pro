export function createAdminInviteController(service) {
  return {
    async list(request, reply) {
      const result = await service.list(request.query);
      reply.header('Cache-Control', 'private, no-store');
      return reply.send(result);
    },

    async revoke(request, reply) {
      const result = await service.revoke({
        actorId: request.auth.id,
        invitationId: request.params.invitationId,
        currentPassword: request.body.currentPassword,
      });
      reply.header('Cache-Control', 'private, no-store');
      return reply.send(result);
    },

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
