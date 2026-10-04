import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from '../../src/app/robots.js';
import sitemap from '../../src/app/sitemap.js';
import { resolvePublicSiteUrl } from '../../src/lib/public-site-url.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('public site URL', () => {
  it('prefers the documented NEXT_PUBLIC_SITE_URL over compatibility fallbacks', () => {
    expect(
      resolvePublicSiteUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://www.attravoya.example',
        NEXT_PUBLIC_WEB_URL: 'https://legacy-public.example',
        WEB_URL: 'https://legacy-server.example',
      }),
    ).toBe('https://www.attravoya.example');
  });

  it('keeps the localhost fallback outside production', () => {
    expect(resolvePublicSiteUrl({ NODE_ENV: 'test' })).toBe('http://localhost:3000');
  });

  it('fails closed when production has no configured public site URL', () => {
    expect(() => resolvePublicSiteUrl({ NODE_ENV: 'production' })).toThrow(
      'NEXT_PUBLIC_SITE_URL is required in production.',
    );
  });

  it('rejects insecure and local production origins', () => {
    expect(() =>
      resolvePublicSiteUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'http://attravoya.example',
      }),
    ).toThrow('Public site URL must use HTTPS in production.');

    expect(() =>
      resolvePublicSiteUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://localhost',
      }),
    ).toThrow('Public site URL must not use a local hostname in production.');
  });

  it('rejects credentials, paths, query strings, and fragments', () => {
    for (const value of [
      'https://user:password@attravoya.example',
      'https://attravoya.example/app',
      'https://attravoya.example?source=test',
      'https://attravoya.example#privacy',
    ]) {
      expect(() =>
        resolvePublicSiteUrl({
          NODE_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: value,
        }),
      ).toThrow();
    }
  });

  it('uses the canonical production origin for sitemap and robots metadata', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.attravoya.example');
    vi.stubEnv('NEXT_PUBLIC_WEB_URL', 'https://legacy-public.example');
    vi.stubEnv('WEB_URL', 'https://legacy-server.example');

    expect(sitemap().find(({ url }) => url.endsWith('/privacy'))?.url).toBe(
      'https://www.attravoya.example/privacy',
    );
    expect(robots().sitemap).toBe('https://www.attravoya.example/sitemap.xml');
  });
});
