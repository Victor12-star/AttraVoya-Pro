function authenticatedUserId(request) {
  return /** @type {any} */ (request).auth.id;
}

function idempotencyKey(request) {
  return String(request.headers['idempotency-key']).trim();
}

function sendPrivate(reply, payload, statusCode = 200) {
  reply.header('Cache-Control', 'private, no-store');
  return reply.code(statusCode).send(payload);
}

export function createPlannerController(service) {
  return {
    async createRequest(request, reply) {
      const result = await service.createRequest({
        userId: authenticatedUserId(request),
        idempotencyKey: idempotencyKey(request),
        input: request.body,
      });

      if (!result.created) reply.header('Idempotency-Replayed', 'true');
      return sendPrivate(reply, { planRequest: result.planRequest }, result.created ? 201 : 200);
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

    async getAllocation(request, reply) {
      const allocation = await service.getAllocation({
        userId: authenticatedUserId(request),
        requestId: request.params.requestId,
      });
      return sendPrivate(reply, { allocation });
    },

    async getDestinationCandidates(request, reply) {
      const destinationCandidates = await service.getDestinationCandidates({
        userId: authenticatedUserId(request),
        requestId: request.params.requestId,
      });
      return sendPrivate(reply, { destinationCandidates });
    },

    async getAffordabilityEvidence(request, reply) {
      const affordabilityEvidence = await service.getAffordabilityEvidence({
        userId: authenticatedUserId(request),
        requestId: request.params.requestId,
        destinationId: request.params.destinationId,
      });
      return sendPrivate(reply, { affordabilityEvidence });
    },
  };
}
