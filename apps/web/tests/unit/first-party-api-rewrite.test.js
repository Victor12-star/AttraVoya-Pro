import { afterEach, describe, expect, it } from 'vitest';

import nextConfig from '../../next.config.mjs';

const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
  if (originalApiBaseUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
  else process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
});

describe('same-origin API rewrite', () => {
  it('proxies browser API routes to the configured backend without exposing cookies to JavaScript', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://attravoya-pro-api-staging.onrender.com';
    expect(await nextConfig.rewrites()).toEqual([
      {
        source: '/api/v1/:path*',
        destination: 'https://attravoya-pro-api-staging.onrender.com/api/v1/:path*',
      },
    ]);
  });

  it('rejects an API target containing credentials', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://user:pass@example.com';
    await expect(nextConfig.rewrites()).rejects.toThrow(
      'NEXT_PUBLIC_API_BASE_URL must be an HTTP(S) origin.',
    );
  });
});
