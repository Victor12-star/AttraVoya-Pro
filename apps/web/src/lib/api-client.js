import { createApiClient } from '@attravoya/api-client';

/**
 * Browser-facing API client. The base URL is public configuration only; all
 * provider secrets and database credentials remain inside the backend.
 */
export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000',
});
