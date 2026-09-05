import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/index.js';

describe('planner API client', () => {
  it('uses the authenticated planner request endpoints without changing request data', async () => {
    const calls = [];
    const fetchImpl = vi.fn(async (url, options = {}) => {
      calls.push({ url: String(url), method: options.method ?? 'GET', body: options.body ?? null });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });
    const body = {
      originLabel: 'Stockholm',
      flexibleDates: true,
      budgetAmount: 25000,
      budgetCurrencyCode: 'SEK',
    };

    await client.createBudgetPlanRequest(body);
    await client.listBudgetPlanRequests();
    await client.getBudgetPlanRequest('request/with space');
    await client.getBudgetAllocation('request/with space');

    expect(calls).toEqual([
      {
        url: 'http://localhost:5000/api/v1/planner/requests',
        method: 'POST',
        body: JSON.stringify(body),
      },
      {
        url: 'http://localhost:5000/api/v1/planner/requests',
        method: 'GET',
        body: null,
      },
      {
        url: 'http://localhost:5000/api/v1/planner/requests/request%2Fwith%20space',
        method: 'GET',
        body: null,
      },
      {
        url: 'http://localhost:5000/api/v1/planner/requests/request%2Fwith%20space/allocation',
        method: 'GET',
        body: null,
      },
    ]);
  });
});
