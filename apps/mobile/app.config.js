import { assertAndroidProductionBuildConfiguration } from './tooling/android-production-config.js';
import { readRevenueCatAndroidPublicConfig } from './tooling/revenuecat-public-config.js';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';
const webBaseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'http://localhost:3000';
const easProjectId = process.env.EAS_PROJECT_ID;
const revenueCatAndroid = readRevenueCatAndroidPublicConfig();

assertAndroidProductionBuildConfiguration({
  apiBaseUrl,
  webBaseUrl,
  easProjectId,
  revenueCatAndroid,
});

/** @type {import('expo/config').ExpoConfig} */
const appConfig = {
  name: 'AttraVoya Pro',
  slug: 'attravoya-pro',
  version: '0.1.0',
  orientation: 'default',
  scheme: 'attravoya',
  platforms: ['android', 'ios', 'web'],
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.attravoya.pro',
    versionCode: 1,
    allowBackup: false,
    predictiveBackGestureEnabled: true,
    // Background location is intentionally blocked. Nearby and emergency features
    // request foreground location only when the user actively opens those tools.
    blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION'],
  },
  ios: {
    bundleIdentifier: 'com.attravoya.pro',
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    './plugins/with-android-billing-launch-mode.js',
    './plugins/with-android-backup-hardening.js',
    './plugins/with-android-cleartext-traffic-disabled.js',
    'expo-router',
    ['expo-secure-store', { configureAndroidBackup: false }],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'AttraVoya Pro uses your location only when you choose Nearby, directions, or emergency location tools.',
      },
    ],
  ],
  extra: {
    // Expo public configuration is bundled into the app. Never place provider
    // provider secrets, authentication secrets, or database URLs in this object.
    apiBaseUrl,
    webBaseUrl,
    revenueCatAndroid,
    ...(easProjectId
      ? {
          eas: {
            projectId: easProjectId,
          },
        }
      : {}),
  },
};

export default appConfig;
