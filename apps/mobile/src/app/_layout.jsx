import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const COLORS = {
  background: '#f6faf8',
  card: '#ffffff',
  text: '#17342a',
  muted: '#5c7169',
  accent: '#0b7a53',
  accentPressed: '#086441',
  border: '#d8e7e0',
  onAccent: '#ffffff',
};

/**
 * Keep route failures local and recoverable without exposing private diagnostic
 * details to travellers. Expo Router supplies retry for the failed route tree.
 *
 * @param {{error: Error, retry: () => void}} props
 */
export function ErrorBoundary({ retry }) {
  return (
    <View accessibilityRole="alert" style={styles.screen}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Something went wrong
        </Text>
        <Text style={styles.message}>
          This screen could not be displayed. Your other app features and saved information are
          still available.
        </Text>
        <Pressable
          accessibilityHint="Attempts to open this screen again"
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>Try again</Text>
        </Pressable>
      </View>
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
    backgroundColor: COLORS.background,
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: 16,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
  },
  message: {
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonPressed: {
    backgroundColor: COLORS.accentPressed,
  },
  buttonLabel: {
    color: COLORS.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
});
