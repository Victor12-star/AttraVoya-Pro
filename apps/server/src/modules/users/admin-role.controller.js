export function createAdminRoleController(service) {
  return {
    async setAdminRole(request, reply) {
      const result = await service.setAdminRole({
        actorId: request.auth.id,
        email: request.body.email,
        currentPassword: request.body.currentPassword,
        action: request.body.action,
      });
      reply.header('Cache-Control', 'private, no-store');
      return reply.send(result);
    },
  };
}
