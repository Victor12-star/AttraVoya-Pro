import { describe, expect, it } from '@jest/globals';

import {
  readRevenueCatAndroidPublicConfig,
  REVENUECAT_ANDROID_PUBLIC_KEY_PATTERN,
} from '../tooling/revenuecat-public-config.js';
import {
  normalizeRevenueCatAndroidConfiguration,
} from '../src/services/revenuecat-config.js';

describe('RevenueCat Android public mobile configuration', () => {
  it('stays disabled by default without bundling an API key', () => {
    expect(readRevenueCatAndroidPublicConfig({})).toEqual({ enabled: false });
    expect(
      readRevenueCatAndroidPublicConfig({
        EXPO_PUBLIC_REVENUECAT_ANDROID_ENABLED: 'false',
        EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'sk_must_not_be_bundled',
      }),
    ).toEqual({ enabled: false });
  });

  it('requires an explicit boolean enablement value', () => {
    expect(() =>
      readRevenueCatAndroidPublicConfig({
        EXPO_PUBLIC_REVENUECAT_ANDROID_ENABLED: 'yes',
      }),
    ).toThrow(/must be true or false/);
  });

  it('accepts only a Google Play public SDK key when enabled', () => {
    expect(
      readRevenueCatAndroidPublicConfig({
        EXPO_PUBLIC_REVENUECAT_ANDROID_ENABLED: 'true',
        EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_public123',
      }),
    ).toEqual({
      enabled: true,
      apiKey: 'goog_public123',
    });

    expect(REVENUECAT_ANDROID_PUBLIC_KEY_PATTERN.test('goog_public123')).toBe(true);
  });

  it('rejects missing, malformed, and secret keys when enabled', () => {
    for (const apiKey of [undefined, '', 'sk_secret123', 'appl_public123', 'goog_bad-key']) {
      expect(() =>
        readRevenueCatAndroidPublicConfig({
          EXPO_PUBLIC_REVENUECAT_ANDROID_ENABLED: 'true',
          EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: apiKey,
        }),
      ).toThrow(/Google Play public SDK key/);
    }
  });

  it('enables the runtime configuration only on Android', () => {
    const config = { enabled: true, apiKey: 'goog_public123' };

    expect(normalizeRevenueCatAndroidConfiguration(config, 'android')).toEqual(config);
    expect(normalizeRevenueCatAndroidConfiguration(config, 'ios')).toEqual({ enabled: false });
    expect(normalizeRevenueCatAndroidConfiguration(config, 'web')).toEqual({ enabled: false });
  });

  it('fails closed when bundled enabled configuration is malformed', () => {
    expect(() =>
      normalizeRevenueCatAndroidConfiguration(
        { enabled: true, apiKey: 'sk_server_secret' },
        'android',
      ),
    ).toThrow('The RevenueCat mobile configuration is invalid.');
  });
});
