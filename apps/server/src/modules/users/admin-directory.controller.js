export function createAdminDirectoryController(repository) {
  return {
    async listUsers(request, reply) {
      const result = await repository.listUsers(request.query);
      reply.header('Cache-Control', 'private, no-store');
      return reply.send(result);
    },
  };
}
