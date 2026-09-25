import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { REVENUECAT_ANDROID_PUBLIC_KEY_PATTERN } from '../../tooling/revenuecat-public-config.js';

const DISABLED_REVENUECAT_ANDROID_CONFIG = Object.freeze({ enabled: false });

function invalidConfiguration() {
  return new Error('The RevenueCat mobile configuration is invalid.');
}

/**
 * Resolve the Android-only RevenueCat public SDK configuration bundled by Expo.
 *
 * The SDK is deliberately disabled on iOS and web in this Android release
 * phase. The public key identifies the RevenueCat app; it is never entitlement
 * proof and must never be treated as a server credential.
 */
export function normalizeRevenueCatAndroidConfiguration(value, platform = Platform.OS) {
  if (platform !== 'android' || value?.enabled !== true) {
    return DISABLED_REVENUECAT_ANDROID_CONFIG;
  }

  const apiKey = typeof value.apiKey === 'string' ? value.apiKey.trim() : '';
  if (!REVENUECAT_ANDROID_PUBLIC_KEY_PATTERN.test(apiKey)) {
    throw invalidConfiguration();
  }

  return Object.freeze({
    enabled: true,
    apiKey,
  });
}

export function getRevenueCatAndroidConfiguration(
  expoConfig = Constants.expoConfig,
  platform = Platform.OS,
) {
  return normalizeRevenueCatAndroidConfiguration(expoConfig?.extra?.revenueCatAndroid, platform);
}
