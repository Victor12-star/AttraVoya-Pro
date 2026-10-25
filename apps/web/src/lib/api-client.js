import { createApiClient } from '@attravoya/api-client';

/**
 * Browser-facing API client. The base URL is public configuration only; all
 * provider secrets and database credentials remain inside the backend.
 */
export const apiClient = createApiClient({
  // Route browser calls through the web origin so HttpOnly session cookies
  // remain first-party. Next.js proxies /api/v1 to the configured backend.
  baseUrl: '/',
});
