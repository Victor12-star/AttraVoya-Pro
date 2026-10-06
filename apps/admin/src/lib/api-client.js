import { createApiClient } from '@attravoya/api-client';

export function createAdminApiClient(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is required for the Admin API client.');
  }

  return createApiClient({
    baseUrl,
    fetchImpl: options.fetchImpl,
    credentials: 'include',
  });
}
