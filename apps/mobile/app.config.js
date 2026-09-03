const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';
const easProjectId = process.env.EAS_PROJECT_ID;

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
    'expo-router',
    'expo-notifications',
    'expo-secure-store',
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
    // credentials, authentication secrets, or database URLs in this object.
    apiBaseUrl,
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
