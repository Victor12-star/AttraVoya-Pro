import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProviderHttpClient } from './provider-http-client.js';
import {
  configureProviderRequestBudgets,
  resetProviderRequestBudgetsForTests,
} from './provider-request-budget.js';

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  resetProviderRequestBudgetsForTests();
});

describe('provider HTTP request budgets', () => {
  it('shares one allowance across separate clients for the same provider', async () => {
    configureProviderRequestBudgets({ geoapify: { maxRequests: 2, windowMs: 60_000 } });
    const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse(200, { ok: true }));
    const common = {
      provider: 'geoapify',
      fetchImpl,
      retryMax: 0,
      nowImpl: () => 10_000,
    };
    const mapsClient = createProviderHttpClient(common);
    const placesClient = createProviderHttpClient(common);

    await expect(mapsClient.requestJson('https://provider.example/maps')).resolves.toEqual({
      ok: true,
    });
    await expect(placesClient.requestJson('https://provider.example/places')).resolves.toEqual({
      ok: true,
    });
    await expect(mapsClient.requestJson('https://provider.example/more')).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMITED',
      details: { reason: 'budget_exhausted', retryAfter: '50' },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('counts retries as real upstream attempts and can stop a retry before fetch', async () => {
    configureProviderRequestBudgets({ ticketmaster: { maxRequests: 1, windowMs: 60_000 } });
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(503, { error: 'temporary' }));
    const metrics = { record: vi.fn() };
    const client = createProviderHttpClient({
      provider: 'ticketmaster',
      fetchImpl,
      retryMax: 1,
      nowImpl: () => 20_000,
      randomImpl: () => 0,
      sleepImpl: async () => {},
      metrics,
    });

    await expect(client.requestJson('https://provider.example/events')).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMITED',
      details: { reason: 'budget_exhausted' },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(metrics.record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        provider: 'ticketmaster',
        outcome: 'rate_limited',
        attempts: 1,
      }),
    );
  });

  it('keeps different provider budgets independent', async () => {
    configureProviderRequestBudgets({
      pexels: { maxRequests: 1, windowMs: 60_000 },
      newsdata: { maxRequests: 1, windowMs: 60_000 },
    });
    const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse(200, { ok: true }));
    const pexels = createProviderHttpClient({
      provider: 'pexels',
      fetchImpl,
      retryMax: 0,
      nowImpl: () => 30_000,
    });
    const newsdata = createProviderHttpClient({
      provider: 'newsdata',
      fetchImpl,
      retryMax: 0,
      nowImpl: () => 30_000,
    });

    await expect(pexels.requestJson('https://provider.example/image')).resolves.toEqual({
      ok: true,
    });
    await expect(newsdata.requestJson('https://provider.example/news')).resolves.toEqual({
      ok: true,
    });
    await expect(pexels.requestJson('https://provider.example/image/2')).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMITED',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
