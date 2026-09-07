import { env } from '../config/env.js';
import { REDACT_PATHS } from './redaction.js';

const UNMATCHED_ROUTE = '<unmatched>';

/**
 * Log the code-defined Fastify route template instead of the raw request URL.
 *
 * Raw URLs can contain private search terms in query strings and high-cardinality
 * identifiers in path parameters. A fixed fallback also prevents unmatched,
 * user-controlled paths from entering logs before an application route exists.
 */
export function requestRouteForLog(request) {
  const route = request?.routeOptions?.url;
  return typeof route === 'string' && route.length > 0 ? route : UNMATCHED_ROUTE;
}

export function createLoggerOptions() {
  return {
    level: env.LOG_LEVEL,
    redact: {
      paths: [...REDACT_PATHS],
      censor: '[REDACTED]',
    },
    serializers: {
      req(request) {
        return {
          id: request.id,
          method: request.method,
          // Keep the existing `url` log field for downstream compatibility,
          // but its value is now a bounded route template rather than raw input.
          url: requestRouteForLog(request),
          remoteAddress: request.ip,
        };
      },
    },
  };
}
