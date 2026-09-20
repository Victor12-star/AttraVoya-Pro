import {
  contentWidths,
  interaction,
  lightTheme,
  radius,
  spacing,
} from '@attravoya/design-tokens';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

const STATE_DEFAULTS = Object.freeze({
  loading: {
    title: 'Loading',
    message: 'Please wait while this information is prepared.',
  },
  empty: {
    title: 'Nothing here yet',
    message: 'New information will appear here when it becomes available.',
  },
  offline: {
    title: 'You appear to be offline',
    message: 'Check your connection and try again. Saved information remains available.',
  },
  error: {
    title: 'This information is unavailable',
    message: 'The request could not be completed safely. Please try again.',
  },
});

function resolveState(kind) {
  return STATE_DEFAULTS[kind] ?? STATE_DEFAULTS.error;
}

/**
 * Shared safe state for asynchronous mobile content. Diagnostic errors are
 * deliberately not accepted as props, preventing private details from reaching
 * traveller-facing messages.
 *
 * @param {{
 *   actionLabel?: string,
 *   kind: 'loading' | 'empty' | 'offline' | 'error',
 *   message?: string,
 *   onAction?: () => void,
 *   title?: string
 * }} props
 */
export default function ContentState({ actionLabel, kind, message, onAction, title }) {
  const defaults = resolveState(kind);
  const isLoading = kind === 'loading';
  const canAct = typeof onAction === 'function' && Boolean(actionLabel);

  return (
    <View
      accessibilityLiveRegion={isLoading ? 'polite' : 'assertive'}
      accessibilityRole={isLoading ? 'progressbar' : 'alert'}
      style={styles.container}
    >
      {isLoading ? (
        <ActivityIndicator
          accessibilityLabel="Loading content"
          color={lightTheme.brandSecondary}
          size="large"
        />
      ) : null}

      <Text accessibilityRole="header" style={styles.title}>
        {title || defaults.title}
      </Text>
      <Text style={styles.message}>{message || defaults.message}</Text>

      {canAct ? (
        <Pressable
          accessibilityHint="Attempts the operation again"
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: contentWidths.form,
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing[3],
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.borderSubtle,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing[6],
  },
  title: {
    color: lightTheme.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: lightTheme.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    minWidth: 160,
    minHeight: interaction.minimumTargetSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.brandPrimary,
    borderRadius: radius.md,
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  buttonPressed: {
    opacity: interaction.pressedOpacity,
  },
  buttonLabel: {
    color: lightTheme.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
