import { lightTheme, spacing } from '@attravoya/design-tokens';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import ContentState from '../components/feedback/content-state.jsx';

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

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
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
