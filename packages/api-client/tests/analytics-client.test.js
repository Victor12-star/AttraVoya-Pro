import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/index.js';

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('analytics API client', () => {
  it('reads aggregate user analytics through a private no-store request', async () => {
    const payload = {
      window: {
        days: 30,
        start: '2026-09-06T12:00:00.000Z',
        end: '2026-10-06T12:00:00.000Z',
      },
      users: {
        totalRegistered: 12430,
        newRegistered: 126,
      },
    };
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/analytics/users?days=30');
      expect(options.method).toBe('GET');
      expect(options.credentials).toBe('include');
      expect(options.cache).toBe('no-store');
      return jsonResponse(payload);
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.getUserAnalytics({ days: 30 })).resolves.toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('uses the server default analytics window when no days value is provided', async () => {
    const fetchImpl = vi.fn(async (url) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/analytics/users?days=7');
      return jsonResponse({
        window: {
          days: 7,
          start: '2026-09-29T12:00:00.000Z',
          end: '2026-10-06T12:00:00.000Z',
        },
        users: { totalRegistered: 10, newRegistered: 2 },
      });
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.getUserAnalytics()).resolves.toMatchObject({
      window: { days: 7 },
    });
  });

  it.each([0, 91, 1.5])(
    'rejects invalid numeric analytics window %j before making a request',
    async (days) => {
      const fetchImpl = vi.fn();
      const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

      expect(() => client.getUserAnalytics({ days })).toThrow(
        'Analytics window days must be an integer from 1 to 90.',
      );
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it('rejects a non-numeric analytics window before making a request', async () => {
    const fetchImpl = vi.fn();
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });
    const invalidDays = /** @type {any} */ ('30');

    expect(() => client.getUserAnalytics({ days: invalidDays })).toThrow(
      'Analytics window days must be an integer from 1 to 90.',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
