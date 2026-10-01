import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';

async function readEasConfiguration() {
  const url = new URL('../eas.json', import.meta.url);
  return JSON.parse(await readFile(url, 'utf8'));
}

describe('mobile EAS environment mapping', () => {
  it('pins every canonical build profile to its matching EAS environment', async () => {
    const configuration = await readEasConfiguration();

    expect(configuration.build.development.environment).toBe('development');
    expect(configuration.build.preview.environment).toBe('preview');
    expect(configuration.build.production.environment).toBe('production');
  });

  it('keeps RevenueCat and API values out of committed EAS build configuration', async () => {
    const configuration = await readEasConfiguration();
    const serialized = JSON.stringify(configuration);

    expect(serialized).not.toContain('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY');
    expect(serialized).not.toContain('goog_');
    expect(serialized).not.toContain('EXPO_PUBLIC_API_BASE_URL');
  });
});
