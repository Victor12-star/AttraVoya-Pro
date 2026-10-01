import { describe, expect, it } from '@jest/globals';

import {
  assertAndroidProductionBuildConfiguration,
  isAndroidProductionBuild,
} from '../tooling/android-production-config.js';

const PROD_ANDROID = {
  APP_VARIANT: 'production',
  EAS_BUILD_PLATFORM: 'android',
};

describe('Android production mobile configuration', () => {
  it('recognizes only the production Android build target', () => {
    expect(isAndroidProductionBuild(PROD_ANDROID)).toBe(true);
    expect(
      isAndroidProductionBuild({
        APP_VARIANT: 'preview',
        EAS_BUILD_PLATFORM: 'android',
      }),
    ).toBe(false);
    expect(
      isAndroidProductionBuild({
        APP_VARIANT: 'production',
        EAS_BUILD_PLATFORM: 'ios',
      }),
    ).toBe(false);
  });

  it('accepts a production Android build only with HTTPS API and enabled RevenueCat', () => {
    expect(() =>
      assertAndroidProductionBuildConfiguration({
        environment: PROD_ANDROID,
        apiBaseUrl: 'https://api.attravoya.example',
        revenueCatAndroid: { enabled: true, apiKey: 'goog_public123' },
      }),
    ).not.toThrow();
  });

  it('rejects localhost, insecure and credential-bearing production API URLs', () => {
    for (const apiBaseUrl of [
      'http://api.attravoya.example',
      'https://localhost:5000',
      'https://127.0.0.1:5000',
      'https://user:password@api.attravoya.example',
      'not-a-url',
    ]) {
      expect(() =>
        assertAndroidProductionBuildConfiguration({
          environment: PROD_ANDROID,
          apiBaseUrl,
          revenueCatAndroid: { enabled: true, apiKey: 'goog_public123' },
        }),
      ).toThrow('Android production configuration');
    }
  });

  it('rejects a production Android build when RevenueCat is disabled', () => {
    expect(() =>
      assertAndroidProductionBuildConfiguration({
        environment: PROD_ANDROID,
        apiBaseUrl: 'https://api.attravoya.example',
        revenueCatAndroid: { enabled: false },
      }),
    ).toThrow('RevenueCat Android must be enabled');
  });

  it('does not impose Android billing on iOS, preview or development builds', () => {
    for (const environment of [
      { APP_VARIANT: 'production', EAS_BUILD_PLATFORM: 'ios' },
      { APP_VARIANT: 'preview', EAS_BUILD_PLATFORM: 'android' },
      { APP_VARIANT: 'development', EAS_BUILD_PLATFORM: 'android' },
      {},
    ]) {
      expect(() =>
        assertAndroidProductionBuildConfiguration({
          environment,
          apiBaseUrl: 'http://localhost:5000',
          revenueCatAndroid: { enabled: false },
        }),
      ).not.toThrow();
    }
  });
});
