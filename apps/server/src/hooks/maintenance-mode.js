import { ServiceUnavailableError } from '../errors/app-error.js';

const MAINTENANCE_BYPASS = new Set([
  'GET /api/v1/health/live',
  'HEAD /api/v1/health/live',
  'GET /api/v1/health/ready',
  'HEAD /api/v1/health/ready',
  'POST /api/v1/payments/webhooks/stripe',
  'POST /api/v1/payments/webhooks/revenuecat',
]);

function requestPath(request) {
  const rawUrl = request?.raw?.url;
  if (typeof rawUrl !== 'string') return '';
  return rawUrl.split('?', 1)[0];
}

export function createMaintenanceModeHook({ enabled = false } = {}) {
  if (typeof enabled !== 'boolean') {
    throw new TypeError('Maintenance mode enabled must be a boolean.');
  }

  return async function maintenanceModeHook(request) {
    if (!enabled) return;

    const key = `${String(request.method ?? '').toUpperCase()} ${requestPath(request)}`;
    if (MAINTENANCE_BYPASS.has(key)) return;

    throw new ServiceUnavailableError(
      'AttraVoya Pro is temporarily unavailable for maintenance. Please try again shortly.',
      {
        details: { reason: 'maintenance' },
      },
    );
  };
}
