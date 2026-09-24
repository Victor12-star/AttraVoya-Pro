import { AuthenticationError } from '../../errors/app-error.js';

export function createStripePlanCatalogController({ stripePlanCatalogService }) {
  if (!stripePlanCatalogService?.list) {
    throw new TypeError('Stripe plan catalog service is required.');
  }

  return Object.freeze({
    async list(request, reply) {
      if (!request.auth?.id) {
        throw new AuthenticationError();
      }

      const catalog = await stripePlanCatalogService.list();
      reply.header('Cache-Control', 'private, no-store');
      return reply.code(200).send(catalog);
    },
  });
}
