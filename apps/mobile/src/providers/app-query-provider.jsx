import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const MAX_QUERY_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429]);
const RETRYABLE_ERROR_CODES = new Set(['NETWORK_ERROR', 'REQUEST_TIMEOUT']);

/**
 * Retry only reads that have a realistic chance of recovering. Authentication,
 * validation, cancellation and malformed responses require user or code action.
 */
export function shouldRetryQuery(failureCount, error) {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  if (RETRYABLE_ERROR_CODES.has(error?.code)) return true;
  if (RETRYABLE_STATUS_CODES.has(error?.status)) return true;
  return Number.isInteger(error?.status) && error.status >= 500 && error.status <= 599;
}

export function queryRetryDelay(attemptIndex) {
  return Math.min(1_000 * 2 ** attemptIndex, 4_000);
}

export function createMobileQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 5 * 60 * 1_000,
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
        staleTime: 30 * 1_000,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export default function AppQueryProvider({ children }) {
  const [queryClient] = useState(createMobileQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
