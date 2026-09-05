function authenticatedUserId(request) {
  return /** @type {any} */ (request).auth.id;
}

export function createPlannerController(service) {
  return {
    async createRequest(request, reply) {
      const planRequest = await service.createRequest({
        userId: authenticatedUserId(request),
        input: request.body,
      });
      return reply.code(201).send({ planRequest });
    },

    async listRequests(request) {
      const requests = await service.listRequests(authenticatedUserId(request));
      return { requests };
    },

    async getRequest(request) {
      const planRequest = await service.getRequest({
        userId: authenticatedUserId(request),
        requestId: request.params.requestId,
      });
      return { planRequest };
    },
  };
}
