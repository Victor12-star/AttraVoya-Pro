import { describe, expect, it } from 'vitest';

import { createLoggerOptions, requestRouteForLog } from './logger.js';

describe('privacy-safe request logging', () => {
  it('uses the matched route template instead of private query and path values', () => {
    const request = {
      id: 'request-1',
      method: 'GET',
      url: '/api/v1/planner/requests/private-request-id?destination=private-place',
      ip: '203.0.113.7',
      routeOptions: { url: '/api/v1/planner/requests/:requestId' },
    };

    expect(requestRouteForLog(request)).toBe('/api/v1/planner/requests/:requestId');

    const serialized = createLoggerOptions().serializers.req(request);
    expect(serialized).toEqual({
      id: 'request-1',
      method: 'GET',
      url: '/api/v1/planner/requests/:requestId',
      remoteAddress: '203.0.113.7',
    });
    expect(JSON.stringify(serialized)).not.toContain('private-request-id');
    expect(JSON.stringify(serialized)).not.toContain('private-place');
  });

  it('uses a fixed label when no application route matched', () => {
    const request = {
      id: 'request-2',
      method: 'GET',
      url: '/user-controlled/private-value?token=should-not-log',
      ip: '203.0.113.8',
    };

    expect(requestRouteForLog(request)).toBe('<unmatched>');

    const serialized = createLoggerOptions().serializers.req(request);
    expect(serialized.url).toBe('<unmatched>');
    expect(JSON.stringify(serialized)).not.toContain('private-value');
    expect(JSON.stringify(serialized)).not.toContain('should-not-log');
  });
});
