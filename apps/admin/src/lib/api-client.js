import { createApiClient } from '@attravoya/api-client';

export function createAdminApiClient(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('Admin API client base URL is required.');
  }

  const client = createApiClient({
    baseUrl,
    fetchImpl: options.fetchImpl,
    credentials: 'same-origin',
  });
  return {
    ...client,
    async getUserAnalytics({ days = 7 } = {}) {
      const response = await (options.fetchImpl ?? fetch)(
        `/api/admin/analytics?days=${encodeURIComponent(days)}`,
        { credentials: 'same-origin', cache: 'no-store' },
      );
      const result = await response.json();
      if (!response.ok) {
        const error = Object.assign(new Error(result.error?.message ?? 'Analytics unavailable.'), {
          status: response.status,
        });
        throw error;
      }
      return result;
    },
  };
}
