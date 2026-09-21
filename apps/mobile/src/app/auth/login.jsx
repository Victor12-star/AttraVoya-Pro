import {
  contentWidths,
  getPageGutter,
  interaction,
  lightTheme,
  radius,
  spacing,
} from '@attravoya/design-tokens';
import { loginSchema } from '@attravoya/validation';
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

export function normalizeLoginInput(email, password) {
  const parsed = loginSchema.safeParse({ email, password });
  return parsed.success ? parsed.data : null;
}

export function LoginForm({ onLogin }) {
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const pageGutter = getPageGutter(width);

  async function submit() {
    if (submittingRef.current) return;
    const credentials = normalizeLoginInput(email, password);
    if (!credentials) {
      setError('Enter a valid email address and password.');
      return;
    }

    setError(null);
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onLogin(credentials);
    } catch (loginError) {
      setError(loginError?.message ?? 'We could not sign you in. Please try again.');
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
          <View style={styles.brandBlock}>
            <Text style={styles.eyebrow}>ATTRAVOYA PRO</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Welcome back
            </Text>
            <Text style={styles.subtitle}>
              Sign in to continue planning trips with your saved budget and travel preferences.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text nativeID="login-email-label" style={styles.label}>
                Email address
              </Text>
              <TextInput
                accessibilityLabel="Email address"
                accessibilityLabelledBy="login-email-label"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSubmitting}
                inputMode="email"
                onChangeText={setEmail}
                returnKeyType="next"
                style={styles.input}
                testID="login-email-input"
                textContentType="emailAddress"
                value={email}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.passwordHeader}>
                <Text nativeID="login-password-label" style={styles.label}>
                  Password
                </Text>
                <Link href="/auth/forgot-password" style={styles.textLink}>
                  <Text style={styles.textLink}>Forgot password?</Text>
                </Link>
              </View>
              <TextInput
                accessibilityLabel="Password"
                accessibilityLabelledBy="login-password-label"
                autoComplete="current-password"
                editable={!isSubmitting}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                returnKeyType="done"
                secureTextEntry
                style={styles.input}
                testID="login-password-input"
                textContentType="password"
                value={password}
              />
            </View>

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
                {isSubmitting ? 'Signing in…' : 'Sign in securely'}
              </Text>
            </Pressable>

            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>New to AttraVoya?</Text>
              <Link href="/auth/register" style={styles.textLink}>
                <Text style={styles.textLink}>Create an account</Text>
              </Link>
            </View>
          </View>

          <Text style={styles.securityNote}>
            Your session is encrypted on this device. AttraVoya never invents live fares or
            availability.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function LoginScreen() {
  const { login } = useMobileAuth();
  return <LoginForm onLogin={login} />;
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
  brandBlock: { width: '100%', maxWidth: contentWidths.form, marginBottom: spacing[6] },
  eyebrow: {
    color: lightTheme.brandSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing[2],
  },
  title: {
    color: lightTheme.textPrimary,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 44,
  },
  subtitle: {
    color: lightTheme.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    marginTop: spacing[3],
  },
  card: {
    width: '100%',
    maxWidth: contentWidths.form,
    gap: spacing[5],
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.borderSubtle,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[6],
  },
  fieldGroup: { gap: spacing[2] },
  passwordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
    paddingHorizontal: spacing[5],
  },
  primaryButtonLabel: { color: lightTheme.surface, fontSize: 16, fontWeight: '700' },
  buttonPressed: { opacity: interaction.pressedOpacity },
  buttonDisabled: { opacity: interaction.disabledOpacity },
  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
  },
  registerPrompt: { color: lightTheme.textSecondary, fontSize: 15 },
  textLink: { color: lightTheme.brandSecondary, fontSize: 15, fontWeight: '700' },
  securityNote: {
    width: '100%',
    maxWidth: contentWidths.form,
    color: lightTheme.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing[5],
    textAlign: 'center',
  },
});
