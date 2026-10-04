import { describe, expect, it } from 'vitest';

import { createRootMetadata } from '../../src/lib/root-metadata.js';

describe('root metadata', () => {
  it('uses the validated production public site origin as metadataBase', () => {
    const metadata = createRootMetadata({
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://www.attravoya.example',
    });

    expect(metadata.metadataBase).toEqual(new URL('https://www.attravoya.example'));
    expect(metadata.title.default).toBe('AttraVoya Pro');
  });

  it('keeps the localhost metadata base outside production', () => {
    const metadata = createRootMetadata({ NODE_ENV: 'test' });

    expect(metadata.metadataBase).toEqual(new URL('http://localhost:3000'));
  });

  it('inherits the production HTTPS and local-host protections', () => {
    expect(() =>
      createRootMetadata({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'http://attravoya.example',
      }),
    ).toThrow('Public site URL must use HTTPS in production.');

    expect(() =>
      createRootMetadata({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://localhost',
      }),
    ).toThrow('Public site URL must not use a local hostname in production.');
  });
});
