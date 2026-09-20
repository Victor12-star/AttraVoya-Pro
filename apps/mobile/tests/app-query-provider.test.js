import { describe, expect, it } from '@jest/globals';

import {
  createMobileQueryClient,
  queryRetryDelay,
  shouldRetryQuery,
} from '../src/providers/app-query-provider.jsx';

describe('mobile query boundary', () => {
  it.each([
    ['a network failure', { code: 'NETWORK_ERROR' }],
    ['a timeout', { code: 'REQUEST_TIMEOUT' }],
    ['rate limiting', { status: 429 }],
    ['a server failure', { status: 503 }],
  ])('retries %s within the bounded allowance', (_label, error) => {
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(false);
  });

  it.each([
    ['caller cancellation', { code: 'REQUEST_ABORTED' }],
    ['invalid API data', { code: 'INVALID_API_RESPONSE', status: 200 }],
    ['authentication failure', { status: 401 }],
    ['validation failure', { status: 422 }],
  ])('does not retry %s', (_label, error) => {
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it('uses capped exponential backoff', () => {
    expect([0, 1, 2, 8].map(queryRetryDelay)).toEqual([1_000, 2_000, 4_000, 4_000]);
  });

  it('keeps read caching bounded and never automatically repeats writes', () => {
    const queryClient = createMobileQueryClient();
    const defaults = queryClient.getDefaultOptions();

    expect(defaults.queries).toMatchObject({
      gcTime: 300_000,
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
      staleTime: 30_000,
      refetchOnReconnect: true,
    });
    expect(defaults.mutations).toMatchObject({ retry: false });
  });
});
