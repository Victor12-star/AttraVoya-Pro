import { describe, expect, it, vi } from 'vitest';

import { createLibreTranslateProvider } from './libretranslate-translation-provider.js';

describe('LibreTranslate adapter', () => {
  it('sends traveller text without retaining it in a provider cache', async () => {
    const http = { requestJson: vi.fn().mockResolvedValue({ translatedText: 'Hola' }) };
    const provider = createLibreTranslateProvider({ http, baseUrl: 'http://localhost:5001' });

    const result = await provider.translate({ text: 'Hello', source: 'en', target: 'es' });

    expect(result.translatedText).toBe('Hola');
    expect(http.requestJson).toHaveBeenCalledWith('http://localhost:5001/translate', expect.objectContaining({
      method: 'POST',
      retry: false,
    }));
  });
});
