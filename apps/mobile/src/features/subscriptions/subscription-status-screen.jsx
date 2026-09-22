import {
  contentWidths,
  getPageGutter,
  interaction,
  lightTheme,
  radius,
  spacing,
} from '@attravoya/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ContentState from '../../components/feedback/content-state.jsx';
import { createMobileApiClient } from '../../services/api-client.js';

const PLAN_KEYS = new Set(['FREE', 'PRO_MONTHLY', 'PRO_YEARLY']);
const PRO_STATUSES = new Set(['ACTIVE', 'TRIALING']);

function safeText(value, maximumLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximumLength ? normalized : null;
}

function safeIsoDate(value) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function normalizeMobileSubscriptionAccess(response) {
  const access = response?.access;
  const key = safeText(access?.plan?.key, 40);
  const tier = safeText(access?.plan?.tier, 16);
  const name = safeText(access?.plan?.name, 80);

  if (!key || !PLAN_KEYS.has(key) || !name) return null;

  if (key === 'FREE') {
    if (tier !== 'FREE' || access?.subscription !== null) return null;
    return Object.freeze({
      key,
      tier,
      name,
      status: null,
      currentPeriodEnd: null,
    });
  }

  const status = safeText(access?.subscription?.status, 20);
  const currentPeriodEnd = safeIsoDate(access?.subscription?.currentPeriodEnd);
  if (tier !== 'PRO' || !status || !PRO_STATUSES.has(status) || !currentPeriodEnd) return null;

  return Object.freeze({
    key,
    tier,
    name,
    status,
    currentPeriodEnd,
  });
}

function formatPeriodEnd(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(value));
  } catch {
    return new Date(value).toISOString().slice(0, 10);
  }
}

function safeLoadMessage(error) {
  if (error?.code === 'NETWORK_ERROR') {
    return 'You appear to be offline. Reconnect and try again.';
  }
  if (error?.code === 'REQUEST_TIMEOUT') {
    return 'The request took too long. Please try again.';
  }
  if (error?.status === 401 || error?.code === 'AUTHENTICATION_REQUIRED') {
    return 'Your secure session could not verify this plan. Sign in again if retry does not help.';
  }
  return 'Your plan status could not be loaded safely. Please try again.';
}

/** @param {{client?: any}} props */
export function MobileSubscriptionStatusContent({ client: suppliedClient }) {
  const client = useMemo(() => suppliedClient ?? createMobileApiClient(), [suppliedClient]);
  const query = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await client.getMyEntitlements();
      const access = normalizeMobileSubscriptionAccess(response);
      if (!access) {
        throw Object.assign(new Error('Invalid subscription response.'), {
          code: 'INVALID_API_RESPONSE',
        });
      }
      return access;
    },
  });

  if (query.isPending) {
    return <ContentState kind="loading" message="Checking your current AttraVoya plan…" />;
  }

  if (query.isError) {
    return (
      <ContentState
        actionLabel="Try again"
        kind={query.error?.code === 'NETWORK_ERROR' ? 'offline' : 'error'}
        message={safeLoadMessage(query.error)}
        onAction={() => void query.refetch()}
        title="Plan status unavailable"
      />
    );
  }

  const access = query.data;
  const isPro = access.tier === 'PRO';

  return (
    <>
      <View accessibilityRole="summary" style={styles.privacyNotice}>
        <Text style={styles.noticeTitle}>Server verified</Text>
        <Text style={styles.noticeText}>
          Plan access comes from your authenticated AttraVoya account. Payment identifiers and
          provider secrets are never shown here.
        </Text>
      </View>

      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={styles.planText}>
            <Text style={styles.label}>CURRENT PLAN</Text>
            <Text accessibilityRole="header" style={styles.planName}>
              {access.name}
            </Text>
          </View>
          <View style={isPro ? styles.proBadge : styles.freeBadge}>
            <Text style={isPro ? styles.proBadgeText : styles.freeBadgeText}>
              {isPro ? (access.status === 'TRIALING' ? 'Trial' : 'Active') : 'Free'}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          {isPro
            ? 'Your account currently has AttraVoya Pro access.'
            : 'Your account is using the Free plan.'}
        </Text>

        {isPro && access.currentPeriodEnd ? (
          <View style={styles.metadata}>
            <Text style={styles.metadataLabel}>Current period ends</Text>
            <Text style={styles.metadataValue}>{formatPeriodEnd(access.currentPeriodEnd)}</Text>
          </View>
        ) : (
          <View style={styles.purchaseNotice}>
            <Text style={styles.purchaseText}>
              New subscription purchases are not available in this build yet.
            </Text>
          </View>
        )}

        <Pressable
          accessibilityHint="Refreshes the server verified plan status"
          accessibilityRole="button"
          disabled={query.isFetching}
          onPress={() => void query.refetch()}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.buttonPressed,
            query.isFetching && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.refreshLabel}>{query.isFetching ? 'Refreshing…' : 'Refresh status'}</Text>
        </Pressable>
      </View>
    </>
  );
}

export default function MobileSubscriptionStatusScreen() {
  const { width } = useWindowDimensions();
  const pageGutter = getPageGutter(width);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageGutter }]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          <Text style={styles.eyebrow}>SUBSCRIPTION</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Your AttraVoya plan
          </Text>
          <Text style={styles.subtitle}>
            Review the Free or Pro access currently recognized by your AttraVoya account.
          </Text>
          <View style={styles.statusContent}>
            <MobileSubscriptionStatusContent />
          </View>
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
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    marginTop: spacing[2],
  },
  subtitle: {
    color: lightTheme.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    marginTop: spacing[3],
  },
  statusContent: { gap: spacing[5], marginTop: spacing[6] },
  privacyNotice: {
    gap: spacing[2],
    backgroundColor: lightTheme.surfaceMuted,
    borderColor: lightTheme.borderSubtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[5],
  },
  noticeTitle: { color: lightTheme.textPrimary, fontSize: 16, fontWeight: '700' },
  noticeText: { color: lightTheme.textSecondary, fontSize: 15, lineHeight: 23 },
  planCard: {
    gap: spacing[5],
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.borderSubtle,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[6],
  },
  planHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  planText: { flex: 1, minWidth: 180 },
  label: {
    color: lightTheme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  planName: {
    color: lightTheme.textPrimary,
    fontSize: 25,
    fontWeight: '700',
    marginTop: spacing[1],
  },
  freeBadge: {
    minHeight: interaction.minimumTargetSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.surfaceMuted,
    borderColor: lightTheme.borderSubtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
  },
  proBadge: {
    minHeight: interaction.minimumTargetSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.surfaceMuted,
    borderColor: lightTheme.brandPrimary,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
  },
  freeBadgeText: { color: lightTheme.textSecondary, fontSize: 14, fontWeight: '700' },
  proBadgeText: { color: lightTheme.brandPrimary, fontSize: 14, fontWeight: '700' },
  description: { color: lightTheme.textSecondary, fontSize: 16, lineHeight: 24 },
  metadata: {
    gap: spacing[1],
    borderTopColor: lightTheme.borderSubtle,
    borderTopWidth: 1,
    paddingTop: spacing[4],
  },
  metadataLabel: { color: lightTheme.textSecondary, fontSize: 14, fontWeight: '600' },
  metadataValue: { color: lightTheme.textPrimary, fontSize: 16, fontWeight: '700' },
  purchaseNotice: {
    backgroundColor: lightTheme.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing[4],
  },
  purchaseText: { color: lightTheme.textSecondary, fontSize: 15, lineHeight: 22 },
  refreshButton: {
    minHeight: interaction.comfortableControlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[5],
  },
  refreshLabel: { color: lightTheme.surface, fontSize: 16, fontWeight: '700' },
  buttonPressed: { opacity: interaction.pressedOpacity },
  buttonDisabled: { opacity: interaction.disabledOpacity },
});
