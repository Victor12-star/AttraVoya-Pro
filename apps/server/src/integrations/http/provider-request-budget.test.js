import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  configureProviderRequestBudgets,
  consumeProviderRequestBudget,
  resetProviderRequestBudgetsForTests,
} from './provider-request-budget.js';

afterEach(() => {
  resetProviderRequestBudgetsForTests();
});

describe('provider request budgets', () => {
  it('leaves providers without a policy unchanged without reading the clock', () => {
    const nowImpl = vi.fn(() => 1_000);

    expect(() => consumeProviderRequestBudget({ provider: 'unbudgeted', nowImpl })).not.toThrow();
    expect(nowImpl).not.toHaveBeenCalled();
  });

  it('shares allowance across the same normalized provider and isolates other providers', () => {
    configureProviderRequestBudgets({
      geoapify: { maxRequests: 2, windowMs: 60_000 },
      pexels: { maxRequests: 1, windowMs: 60_000 },
    });
    const nowImpl = () => 10_000;

    consumeProviderRequestBudget({ provider: 'Geoapify', nowImpl });
    consumeProviderRequestBudget({ provider: 'geoapify', nowImpl });
    consumeProviderRequestBudget({ provider: 'pexels', nowImpl });

    expect(() => consumeProviderRequestBudget({ provider: 'GEOAPIFY', nowImpl })).toThrowError(
      expect.objectContaining({
        code: 'PROVIDER_RATE_LIMITED',
        details: expect.objectContaining({ reason: 'budget_exhausted', retryAfter: '60' }),
      }),
    );
    expect(() => consumeProviderRequestBudget({ provider: 'pexels', nowImpl })).toThrowError(
      expect.objectContaining({ code: 'PROVIDER_RATE_LIMITED' }),
    );
  });

  it('restores allowance when the configured window rolls over', () => {
    configureProviderRequestBudgets({ resend: { maxRequests: 1, windowMs: 1_000 } });
    let nowMs = 5_000;
    const nowImpl = () => nowMs;

    consumeProviderRequestBudget({ provider: 'resend', nowImpl });
    expect(() => consumeProviderRequestBudget({ provider: 'resend', nowImpl })).toThrowError(
      expect.objectContaining({ code: 'PROVIDER_RATE_LIMITED' }),
    );

    nowMs += 1_000;
    expect(() => consumeProviderRequestBudget({ provider: 'resend', nowImpl })).not.toThrow();
  });

  it('replaces policy state when startup configuration is refreshed', () => {
    configureProviderRequestBudgets({ newsdata: { maxRequests: 1, windowMs: 60_000 } });
    const nowImpl = () => 5_000;
    consumeProviderRequestBudget({ provider: 'newsdata', nowImpl });

    configureProviderRequestBudgets({ newsdata: { maxRequests: 2, windowMs: 60_000 } });

    expect(() => consumeProviderRequestBudget({ provider: 'newsdata', nowImpl })).not.toThrow();
    expect(() => consumeProviderRequestBudget({ provider: 'newsdata', nowImpl })).not.toThrow();
  });
});
