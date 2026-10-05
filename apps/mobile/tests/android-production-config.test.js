import { describe, expect, it } from '@jest/globals';

import {
  assertAndroidProductionBuildConfiguration,
  isAndroidProductionBuild,
} from '../tooling/android-production-config.js';

const PROD_ANDROID = {
  APP_VARIANT: 'production',
  EAS_BUILD_PLATFORM: 'android',
};

const EAS_PROJECT_ID = '0cd3da2d-1234-4abc-8def-1234567890ab';

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
        apiBaseUrl: 'https://api.attravoya.app',
        webBaseUrl: 'https://attravoya.app',
        easProjectId: EAS_PROJECT_ID,
        revenueCatAndroid: { enabled: true, apiKey: 'goog_public123' },
      }),
    ).not.toThrow();
  });

  it('rejects localhost, insecure and credential-bearing production API URLs', () => {
    for (const apiBaseUrl of [
      'http://api.attravoya.app',
      'https://localhost:5000',
      'https://127.0.0.1:5000',
      'https://user:password@api.attravoya.app',
      'not-a-url',
    ]) {
      expect(() =>
        assertAndroidProductionBuildConfiguration({
          environment: PROD_ANDROID,
          apiBaseUrl,
          webBaseUrl: 'https://attravoya.app',
          easProjectId: EAS_PROJECT_ID,
          revenueCatAndroid: { enabled: true, apiKey: 'goog_public123' },
        }),
      ).toThrow('Android production configuration');
    }
  });

  it('rejects missing, insecure, loopback and credential-bearing public web URLs', () => {
    for (const webBaseUrl of [
      undefined,
      'http://attravoya.app',
      'https://localhost:3000',
      'https://127.0.0.1:3000',
      'https://user:password@attravoya.app',
      'https://attravoya.app?source=mobile',
      'https://attravoya.app#privacy',
      'not-a-url',
    ]) {
      expect(() =>
        assertAndroidProductionBuildConfiguration({
          environment: PROD_ANDROID,
          apiBaseUrl: 'https://api.attravoya.app',
          webBaseUrl,
          easProjectId: EAS_PROJECT_ID,
          revenueCatAndroid: { enabled: true, apiKey: 'goog_public123' },
        }),
      ).toThrow('Android production configuration');
    }
  });


  it('rejects reserved placeholder production hosts', () => {
    for (const value of [
      'https://api.attravoya.example',
      'https://attravoya.test',
      'https://attravoya.invalid',
      'https://example.com',
    ]) {
      expect(() =>
        assertAndroidProductionBuildConfiguration({
          environment: PROD_ANDROID,
          apiBaseUrl: value,
          webBaseUrl: 'https://attravoya.app',
          easProjectId: EAS_PROJECT_ID,
          revenueCatAndroid: { enabled: true, apiKey: 'goog_public123' },
        }),
      ).toThrow('reserved placeholder host');
    }
  });

  it('rejects a production Android build without a valid EAS project ID', () => {
    for (const easProjectId of [undefined, '', 'not-a-project-id']) {
      expect(() =>
        assertAndroidProductionBuildConfiguration({
          environment: PROD_ANDROID,
          apiBaseUrl: 'https://api.attravoya.app',
          webBaseUrl: 'https://attravoya.app',
          easProjectId,
          revenueCatAndroid: { enabled: true, apiKey: 'goog_public123' },
        }),
      ).toThrow('EAS_PROJECT_ID must be a valid project UUID');
    }
  });

  it('rejects a production Android build when RevenueCat is disabled', () => {
    expect(() =>
      assertAndroidProductionBuildConfiguration({
        environment: PROD_ANDROID,
        apiBaseUrl: 'https://api.attravoya.app',
        webBaseUrl: 'https://attravoya.app',
        easProjectId: EAS_PROJECT_ID,
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
          webBaseUrl: 'http://localhost:3000',
          revenueCatAndroid: { enabled: false },
        }),
      ).not.toThrow();
    }
  });
});
