import { describe, expect, it, vi } from 'vitest';

import { createProviderCache } from '../http/provider-cache.js';
import { createFrankfurterCurrencyProvider } from './frankfurter-currency-provider.js';

describe('Frankfurter adapter', () => {
  it('converts with a real provider rate shape and marks values approximate', async () => {
    const http = {
      requestJson: vi
        .fn()
        .mockResolvedValue({ date: '2026-09-03', base: 'SEK', quote: 'EUR', rate: 0.09 }),
    };
    const provider = createFrankfurterCurrencyProvider({ http, cache: createProviderCache() });

    const result = await provider.convert({ amount: 1000, from: 'SEK', to: 'EUR' });

    expect(result).toMatchObject({
      from: 'SEK',
      to: 'EUR',
      rate: 0.09,
      convertedAmount: 90,
      approximate: true,
    });
  });
});
