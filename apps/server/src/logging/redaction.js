// Pino redaction paths are deliberately broad. Logging request metadata is
// useful for debugging, but credentials and authentication tokens must never
// be written to development or production logs.
export const REDACT_PATHS = Object.freeze([
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'res.headers["set-cookie"]',
  '*.accessToken',
  '*.refreshToken',
  '*.token',
  '*.secret',
  '*.apiKey',
  '*.password',
]);

const SECRET_PATTERNS = [
  // Redact credentials embedded in URLs such as PostgreSQL connection strings.
  /([a-z][a-z0-9+.-]*:\/\/[^:\s/@]+:)[^@\s/]+(@)/gi,
  /\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi,
  /\b(api[_-]?key|token|secret|password)\s*[=:]\s*[^\s,;]+/gi,
];

export function sanitizeLogText(value) {
  if (typeof value !== 'string') return value;

  return SECRET_PATTERNS.reduce((result, pattern) => {
    if (pattern.source.startsWith('([a-z]')) {
      return result.replace(pattern, '$1[REDACTED]$2');
    }
    if (pattern.source.startsWith('\\b(Bearer')) {
      return result.replace(pattern, '$1[REDACTED]');
    }
    return result.replace(pattern, '$1=[REDACTED]');
  }, value);
}

/**
 * Convert an Error into a deliberately small log object. This avoids passing
 * arbitrary nested provider/database objects to Pino while retaining enough
 * information to diagnose the failure with its request ID.
 */
export function safeErrorForLog(error) {
  if (!(error instanceof Error)) {
    return { message: sanitizeLogText(String(error)) };
  }

  return {
    name: error.name,
    message: sanitizeLogText(error.message),
    stack: sanitizeLogText(error.stack),
    ...('code' in error && typeof error.code === 'string' ? { code: error.code } : {}),
  };
}
