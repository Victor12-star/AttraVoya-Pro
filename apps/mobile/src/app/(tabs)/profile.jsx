import {
  contentWidths,
  getPageGutter,
  interaction,
  lightTheme,
  radius,
  spacing,
} from '@attravoya/design-tokens';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMobileAuth } from '../../providers/mobile-auth-provider.jsx';

export function ProfileContent({ onLogout, user }) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const signingOutRef = useRef(false);

  async function signOut() {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setIsSigningOut(true);
    setError(null);
    try {
      await onLogout();
    } catch {
      // MobileAuthProvider clears the local credential even when the server is
      // offline, so private data never remains accessible after this action.
      setError('You were signed out on this device. The server could not be reached.');
    } finally {
      signingOutRef.current = false;
      setIsSigningOut(false);
    }
  }

  if (!user) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Account details unavailable
        </Text>
        <Text style={styles.bodyText}>Sign in again to restore your account details securely.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.card}>
        <View style={styles.identityRow}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{user.email.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.identityText}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Your account
            </Text>
            <Text selectable style={styles.email}>
              {user.email}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Email status</Text>
          <Text style={user.emailVerified ? styles.verifiedBadge : styles.warningBadge}>
            {user.emailVerified ? 'Verified' : 'Verification required'}
          </Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Privacy and account controls</Text>
        <Text style={styles.bodyText}>
          Session management, data export, and account deletion will be added here in verified
          stages before public release.
        </Text>
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityHint="Removes the secure session from this device."
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={signOut}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.buttonPressed,
          isSigningOut && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.logoutLabel}>
          {isSigningOut ? 'Signing out…' : 'Sign out securely'}
        </Text>
      </Pressable>
    </>
  );
}

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const { logout, user } = useMobileAuth();
  const pageGutter = getPageGutter(width);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageGutter }]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          <Text style={styles.eyebrow}>YOUR PREFERENCES</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Travel on your terms
          </Text>
          <Text style={styles.subtitle}>
            Review your account identity and control the secure session on this device.
          </Text>
          <ProfileContent onLogout={logout} user={user} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTheme.background },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: spacing[10],
    paddingTop: spacing[8],
  },
  content: { width: '100%', maxWidth: contentWidths.reading },
  eyebrow: {
    color: lightTheme.brandSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: lightTheme.textPrimary,
    fontSize: 36,
    fontWeight: '700',
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
    gap: spacing[5],
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.borderSubtle,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginTop: spacing[6],
    padding: spacing[6],
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.brandPrimary,
    borderRadius: radius.pill,
  },
  avatarText: { color: lightTheme.surface, fontSize: 22, fontWeight: '700' },
  identityText: { flex: 1, gap: spacing[1] },
  cardTitle: { color: lightTheme.textPrimary, fontSize: 20, fontWeight: '700' },
  email: { color: lightTheme.textSecondary, fontSize: 15, lineHeight: 22 },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    borderTopColor: lightTheme.borderSubtle,
    borderTopWidth: 1,
    paddingTop: spacing[4],
  },
  statusLabel: { color: lightTheme.textSecondary, fontSize: 15, fontWeight: '600' },
  verifiedBadge: { color: lightTheme.success, fontSize: 14, fontWeight: '700' },
  warningBadge: { color: lightTheme.warning, fontSize: 14, fontWeight: '700' },
  notice: {
    gap: spacing[2],
    backgroundColor: lightTheme.surfaceMuted,
    borderRadius: radius.lg,
    marginTop: spacing[5],
    padding: spacing[5],
  },
  noticeTitle: { color: lightTheme.textPrimary, fontSize: 16, fontWeight: '700' },
  bodyText: { color: lightTheme.textSecondary, fontSize: 15, lineHeight: 23 },
  errorText: { color: lightTheme.danger, fontSize: 14, lineHeight: 21, marginTop: spacing[4] },
  logoutButton: {
    minHeight: interaction.comfortableControlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.textPrimary,
    borderRadius: radius.md,
    marginTop: spacing[5],
    paddingHorizontal: spacing[5],
  },
  logoutLabel: { color: lightTheme.surface, fontSize: 16, fontWeight: '700' },
  buttonPressed: { opacity: interaction.pressedOpacity },
  buttonDisabled: { opacity: interaction.disabledOpacity },
});
