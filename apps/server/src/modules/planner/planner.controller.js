function authenticatedUserId(request) {
  return /** @type {any} */ (request).auth.id;
}

function sendPrivate(reply, payload, statusCode = 200) {
  reply.header('Cache-Control', 'private, no-store');
  return reply.code(statusCode).send(payload);
}

export function createPlannerController(service) {
  return {
    async createRequest(request, reply) {
      const planRequest = await service.createRequest({
        userId: authenticatedUserId(request),
        input: request.body,
      });
      return sendPrivate(reply, { planRequest }, 201);
    },

    async listRequests(request, reply) {
      const requests = await service.listRequests(authenticatedUserId(request));
      return sendPrivate(reply, { requests });
    },

    async getRequest(request, reply) {
      const planRequest = await service.getRequest({
        userId: authenticatedUserId(request),
        requestId: request.params.requestId,
      });
      return sendPrivate(reply, { planRequest });
    },
  };
}
