import { env } from '../config/env.js';
import { REDACT_PATHS } from './redaction.js';

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
          url: request.url,
          remoteAddress: request.ip,
        };
      },
    },
  };
}
