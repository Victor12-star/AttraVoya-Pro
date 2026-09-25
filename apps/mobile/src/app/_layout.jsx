import { lightTheme, spacing } from '@attravoya/design-tokens';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import ContentState from '../components/feedback/content-state.jsx';
import AppQueryProvider from '../providers/app-query-provider.jsx';
import { MobileAuthProvider, useMobileAuth } from '../providers/mobile-auth-provider.jsx';
import { createMobileApiClient } from '../services/api-client.js';
import { createRevenueCatAndroidRuntime } from '../services/revenuecat-android-runtime.js';

/**
 * Keep route failures local and recoverable without exposing private diagnostic
 * details to travellers. Expo Router supplies retry for the failed route tree.
 *
 * @param {{error: Error, retry: () => void}} props
 */
export function ErrorBoundary({ retry }) {
  return (
    <View style={styles.screen}>
      <ContentState
        actionLabel="Try again"
        kind="error"
        message="This screen could not be displayed. Your other app features and saved information are still available."
        onAction={retry}
        title="Something went wrong"
      />
    </View>
  );
}

// Screen failures use the same safe recovery experience throughout nested routes.
export const unstable_settings = {
  screenErrorBoundary: ErrorBoundary,
};

function SessionNavigator() {
  const { retryRestore, status } = useMobileAuth();

  if (status === 'loading') {
    return (
      <View style={styles.screen}>
        <ContentState kind="loading" message="Restoring your secure travel session…" />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.screen}>
        <ContentState
          actionLabel="Try again"
          kind="offline"
          message="Your saved session is still secure. Reconnect to continue."
          onAction={retryRestore}
        />
      </View>
    );
  }

  const isAuthenticated = status === 'authenticated';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="auth/reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="destination/[slug]" />
        <Stack.Screen name="emergency/index" />
        <Stack.Screen name="premium/index" />
        <Stack.Screen name="trip/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [mobileServices] = useState(() => {
    const client = createMobileApiClient();
    return Object.freeze({
      client,
      revenueCatSession: createRevenueCatAndroidRuntime({ client }),
    });
  });

  return (
    <AppQueryProvider>
      <MobileAuthProvider
        client={mobileServices.client}
        revenueCatSession={mobileServices.revenueCatSession}
      >
        <SessionNavigator />
      </MobileAuthProvider>
    </AppQueryProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.background,
    padding: spacing[6],
  },
});
