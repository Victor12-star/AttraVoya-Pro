import {
  contentWidths,
  getPageGutter,
  interaction,
  lightTheme,
  radius,
  spacing,
} from '@attravoya/design-tokens';
import { registerSchema } from '@attravoya/validation';
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

export function normalizeRegistrationInput(email, password, confirmPassword) {
  if (password !== confirmPassword) return null;
  const parsed = registerSchema.safeParse({ email, password });
  return parsed.success ? parsed.data : null;
}

export function RegistrationSuccess({ email, verificationDelivery }) {
  const emailSent = verificationDelivery === 'sent';
  return (
    <View accessibilityLiveRegion="polite" style={styles.successPanel}>
      <Text accessibilityRole="header" style={styles.successTitle}>
        Account created
      </Text>
      <Text style={styles.successBody}>
        {emailSent
          ? `We sent a verification link to ${email}. Open it to activate your account.`
          : `Your account was created for ${email}, but the verification email could not be sent. Please try the resend option from the sign-in flow.`}
      </Text>
      <Text style={styles.successNote}>
        For security, the verification link opens on the AttraVoya website. Return here and sign in
        after verification.
      </Text>
      <Link href="/auth/login" style={styles.primaryLink}>
        <Text style={styles.primaryLinkLabel}>Continue to sign in</Text>
      </Link>
    </View>
  );
}

export function RegisterForm({ onRegister }) {
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [result, setResult] = useState(/** @type {any} */ (null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const pageGutter = getPageGutter(width);

  async function submit() {
    if (submittingRef.current) return;
    const details = normalizeRegistrationInput(email, password, confirmPassword);
    if (!details) {
      setError(
        password !== confirmPassword
          ? 'The passwords do not match.'
          : 'Use a valid email and a password with at least 8 characters, one letter, and one number.',
      );
      return;
    }

    setError(null);
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const response = await onRegister(details);
      setPassword('');
      setConfirmPassword('');
      setResult(response);
    } catch (registrationError) {
      setError(registrationError?.message ?? 'We could not create your account. Please try again.');
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
              Start planning with confidence
            </Text>
            <Text style={styles.subtitle}>
              Create a secure account to save budgets, trips, and travel preferences across devices.
            </Text>

            {result ? (
              <RegistrationSuccess
                email={result.user.email}
                verificationDelivery={result.verificationDelivery}
              />
            ) : (
              <View style={styles.card}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  inputMode="email"
                  onChangeText={setEmail}
                  style={styles.input}
                  testID="register-email-input"
                  textContentType="emailAddress"
                  value={email}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  accessibilityHint="Use at least 8 characters with one letter and one number."
                  accessibilityLabel="Password"
                  autoComplete="new-password"
                  editable={!isSubmitting}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  testID="register-password-input"
                  textContentType="newPassword"
                  value={password}
                />
                <Text style={styles.helpText}>
                  At least 8 characters, including a letter and number.
                </Text>

                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  accessibilityLabel="Confirm password"
                  autoComplete="new-password"
                  editable={!isSubmitting}
                  onChangeText={setConfirmPassword}
                  onSubmitEditing={submit}
                  returnKeyType="done"
                  secureTextEntry
                  style={styles.input}
                  testID="register-confirm-password-input"
                  textContentType="newPassword"
                  value={confirmPassword}
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
                    {isSubmitting ? 'Creating account…' : 'Create account'}
                  </Text>
                </Pressable>

                <View style={styles.signInRow}>
                  <Text style={styles.signInPrompt}>Already have an account?</Text>
                  <Link href="/auth/login" style={styles.textLink}>
                    <Text style={styles.textLink}>Sign in</Text>
                  </Link>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function RegisterScreen() {
  const { register } = useMobileAuth();
  return <RegisterForm onRegister={register} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTheme.background },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
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
  label: { color: lightTheme.textPrimary, fontSize: 15, fontWeight: '600', marginTop: spacing[1] },
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
  helpText: { color: lightTheme.textMuted, fontSize: 13, lineHeight: 19 },
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
  signInRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  signInPrompt: { color: lightTheme.textSecondary, fontSize: 15 },
  textLink: { color: lightTheme.brandSecondary, fontSize: 15, fontWeight: '700' },
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
