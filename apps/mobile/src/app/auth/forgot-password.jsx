import {
  contentWidths,
  getPageGutter,
  interaction,
  lightTheme,
  radius,
  spacing,
} from '@attravoya/design-tokens';
import { forgotPasswordSchema } from '@attravoya/validation';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMobileAuth } from '../../providers/mobile-auth-provider.jsx';

export function normalizePasswordResetRequest(email) {
  const parsed = forgotPasswordSchema.safeParse({ email });
  return parsed.success ? parsed.data.email : null;
}

export function PasswordResetRequestSuccess() {
  return (
    <View accessibilityLiveRegion="polite" style={styles.successPanel}>
      <Text accessibilityRole="header" style={styles.successTitle}>
        Check your email
      </Text>
      <Text style={styles.successBody}>
        If an account exists for that email, password-reset instructions will be sent.
      </Text>
      <Text style={styles.successNote}>
        The secure link opens on the AttraVoya website and expires after one hour. You can return to
        the app and sign in after changing your password.
      </Text>
      <Link href="/auth/login" style={styles.primaryLink}>
        <Text style={styles.primaryLinkLabel}>Return to sign in</Text>
      </Link>
    </View>
  );
}

export function ForgotPasswordForm({ onRequestPasswordReset }) {
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [complete, setComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const pageGutter = getPageGutter(width);

  async function submit() {
    if (submittingRef.current) return;
    const normalizedEmail = normalizePasswordResetRequest(email);
    if (!normalizedEmail) {
      setError('Enter a valid email address.');
      return;
    }

    setError(null);
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onRequestPasswordReset(normalizedEmail);
      setComplete(true);
    } catch (requestError) {
      setError(requestError?.message ?? 'We could not request a password reset. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageGutter }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.eyebrow}>ATTRAVOYA PRO</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Reset your password
            </Text>
            <Text style={styles.subtitle}>
              Enter the email used for your account and we’ll send secure reset instructions if it
              matches an account.
            </Text>

            {complete ? (
              <PasswordResetRequestSuccess />
            ) : (
              <View style={styles.card}>
                <Text nativeID="forgot-password-email-label" style={styles.label}>
                  Email address
                </Text>
                <TextInput
                  accessibilityLabel="Email address"
                  accessibilityLabelledBy="forgot-password-email-label"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  inputMode="email"
                  onChangeText={setEmail}
                  onSubmitEditing={submit}
                  returnKeyType="send"
                  style={styles.input}
                  testID="forgot-password-email-input"
                  textContentType="emailAddress"
                  value={email}
                />

                {error ? (
                  <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                    {error}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={submit}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                    isSubmitting && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {isSubmitting ? 'Sending instructions…' : 'Send reset instructions'}
                  </Text>
                </Pressable>

                <Link href="/auth/login" style={styles.textLink}>
                  <Text style={styles.textLink}>Back to sign in</Text>
                </Link>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useMobileAuth();
  return <ForgotPasswordForm onRequestPasswordReset={requestPasswordReset} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTheme.background },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing[10],
    paddingTop: spacing[8],
  },
  content: { width: '100%', maxWidth: contentWidths.form },
  eyebrow: {
    color: lightTheme.brandSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: lightTheme.textPrimary,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.7,
    lineHeight: 43,
    marginTop: spacing[2],
  },
  subtitle: {
    color: lightTheme.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    marginTop: spacing[3],
  },
  card: {
    gap: spacing[3],
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.borderSubtle,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginTop: spacing[6],
    padding: spacing[6],
  },
  label: { color: lightTheme.textPrimary, fontSize: 15, fontWeight: '600' },
  input: {
    minHeight: interaction.comfortableControlHeight,
    color: lightTheme.textPrimary,
    backgroundColor: lightTheme.background,
    borderColor: lightTheme.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: spacing[4],
  },
  errorText: { color: lightTheme.danger, fontSize: 14, lineHeight: 20 },
  primaryButton: {
    minHeight: interaction.comfortableControlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.brandPrimary,
    borderRadius: radius.md,
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
  },
  primaryButtonLabel: { color: lightTheme.surface, fontSize: 16, fontWeight: '700' },
  buttonPressed: { opacity: interaction.pressedOpacity },
  buttonDisabled: { opacity: interaction.disabledOpacity },
  textLink: {
    color: lightTheme.brandSecondary,
    fontSize: 15,
    fontWeight: '700',
    minHeight: interaction.minimumTargetSize,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  successPanel: {
    gap: spacing[4],
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.success,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginTop: spacing[6],
    padding: spacing[6],
  },
  successTitle: { color: lightTheme.textPrimary, fontSize: 24, fontWeight: '700' },
  successBody: { color: lightTheme.textSecondary, fontSize: 16, lineHeight: 24 },
  successNote: { color: lightTheme.textMuted, fontSize: 14, lineHeight: 21 },
  primaryLink: {
    minHeight: interaction.minimumTargetSize,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: lightTheme.brandPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  primaryLinkLabel: { color: lightTheme.surface, fontSize: 16, fontWeight: '700' },
});
