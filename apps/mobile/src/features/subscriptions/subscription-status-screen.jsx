import {
  contentWidths,
  getPageGutter,
  interaction,
  lightTheme,
  radius,
  spacing,
} from '@attravoya/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ContentState from '../../components/feedback/content-state.jsx';
import { useMobileBilling } from '../../providers/mobile-billing-provider.jsx';
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

/** @param {{client?: any, loadOfferingCatalog?: () => Promise<any[]>, purchasePlan?: (period: 'monthly' | 'yearly') => Promise<any>, restorePurchases?: () => Promise<any>}} props */
export function MobileSubscriptionStatusContent({
  client: suppliedClient,
  loadOfferingCatalog,
  purchasePlan,
  restorePurchases,
}) {
  const client = useMemo(() => suppliedClient ?? createMobileApiClient(), [suppliedClient]);
  const [purchaseState, setPurchaseState] = useState(
    /** @type {{status: string, message: string | null}} */ ({ status: 'idle', message: null }),
  );
  const [restoreState, setRestoreState] = useState(
    /** @type {{status: string, message: string | null}} */ ({ status: 'idle', message: null }),
  );
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

  const shouldLoadOfferings =
    query.data?.tier === 'FREE' && typeof loadOfferingCatalog === 'function';
  const offeringQuery = useQuery({
    queryKey: ['subscription-offerings'],
    queryFn: () =>
      typeof loadOfferingCatalog === 'function' ? loadOfferingCatalog() : Promise.resolve([]),
    enabled: shouldLoadOfferings,
    retry: false,
  });

  if (query.isPending) {
    return <ContentState kind="loading" message="Checking your current AttraVoya plan…" />;
  }

  if (query.isError) {
    const queryError = /** @type {any} */ (query.error);
    return (
      <ContentState
        actionLabel="Try again"
        kind={queryError?.code === 'NETWORK_ERROR' ? 'offline' : 'error'}
        message={safeLoadMessage(queryError)}
        onAction={() => void query.refetch()}
        title="Plan status unavailable"
      />
    );
  }

  const access = query.data;
  const isPro = access.tier === 'PRO';
  const purchasePending = purchaseState.status === 'pending';
  const restorePending = restoreState.status === 'pending';
  const billingPending = purchasePending || restorePending;

  async function handlePurchase(period) {
    if (typeof purchasePlan !== 'function' || billingPending) return;

    setPurchaseState({ status: 'pending', message: null });
    let result;
    try {
      result = await purchasePlan(period);
    } catch {
      setPurchaseState({
        status: 'failed',
        message: 'The purchase could not be completed safely. Please try again.',
      });
      return;
    }

    if (result?.status === 'cancelled') {
      setPurchaseState({
        status: 'cancelled',
        message: 'Purchase cancelled. No changes were made to your AttraVoya plan.',
      });
      return;
    }

    if (result?.status === 'unavailable') {
      setPurchaseState({
        status: 'unavailable',
        message: 'Google Play purchasing is unavailable right now. Please try again later.',
      });
      return;
    }

    if (result?.status !== 'completed') {
      setPurchaseState({
        status: 'failed',
        message: 'The purchase could not be completed safely. Please try again.',
      });
      return;
    }

    const refreshed = await query.refetch();
    if (refreshed.data?.tier === 'PRO') {
      setPurchaseState({
        status: 'verified',
        message: 'Your purchase has been verified by AttraVoya.',
      });
      return;
    }

    setPurchaseState({
      status: 'pending-verification',
      message:
        'Google Play completed the purchase. AttraVoya is still verifying Pro access. Refresh status shortly.',
    });
  }

  async function handleRestore() {
    if (typeof restorePurchases !== 'function' || billingPending) return;

    setRestoreState({ status: 'pending', message: null });
    let result;
    try {
      result = await restorePurchases();
    } catch {
      setRestoreState({
        status: 'failed',
        message: 'Previous Google Play purchases could not be restored safely. Please try again.',
      });
      return;
    }

    if (result?.status === 'unavailable') {
      setRestoreState({
        status: 'unavailable',
        message: 'Google Play restore is unavailable right now. Please try again later.',
      });
      return;
    }

    if (result?.status !== 'completed') {
      setRestoreState({
        status: 'failed',
        message: 'Previous Google Play purchases could not be restored safely. Please try again.',
      });
      return;
    }

    const refreshed = await query.refetch();
    if (refreshed.data?.tier === 'PRO') {
      setRestoreState({
        status: 'verified',
        message: 'Your restored purchase has been verified by AttraVoya.',
      });
      return;
    }

    setRestoreState({
      status: 'pending-verification',
      message:
        'Google Play restore completed. AttraVoya has not verified Pro access yet. Refresh status shortly.',
    });
  }

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
          <>
            <View style={styles.purchaseNotice}>
              <Text style={styles.purchaseText}>
                Google Play handles the payment. AttraVoya enables Pro only after your server
                verified plan status confirms it.
              </Text>
            </View>

            {shouldLoadOfferings ? (
              <View style={styles.offeringSection}>
                <Text style={styles.offeringTitle}>Google Play prices</Text>
                {offeringQuery.isPending ? (
                  <Text style={styles.offeringStatus}>Checking current prices…</Text>
                ) : offeringQuery.isError ? (
                  <Text style={styles.offeringStatus}>
                    Live Google Play prices are unavailable right now.
                  </Text>
                ) : offeringQuery.data?.length ? (
                  <View style={styles.offeringList}>
                    {offeringQuery.data.map((plan) => (
                      <View key={plan.period} style={styles.offeringRow}>
                        <View style={styles.offeringPlan}>
                          <Text style={styles.offeringPeriod}>
                            {plan.period === 'monthly' ? 'Monthly' : 'Yearly'}
                          </Text>
                          <Text style={styles.offeringPrice}>{plan.price}</Text>
                        </View>
                        {typeof purchasePlan === 'function' ? (
                          <Pressable
                            accessibilityHint={`Starts the ${plan.period} Google Play subscription purchase`}
                            accessibilityRole="button"
                            disabled={billingPending}
                            onPress={() => void handlePurchase(plan.period)}
                            style={({ pressed }) => [
                              styles.purchaseButton,
                              pressed && styles.buttonPressed,
                              billingPending && styles.buttonDisabled,
                            ]}
                          >
                            <Text style={styles.purchaseButtonLabel}>
                              {purchasePending ? 'Processing…' : `Choose ${plan.period}`}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.offeringStatus}>
                    Google Play subscription prices are not available in this build.
                  </Text>
                )}
                <Text style={styles.offeringNote}>
                  Prices come from Google Play through RevenueCat. Your AttraVoya account still
                  controls whether Pro access is active.
                </Text>
                {purchaseState.message ? (
                  <Text accessibilityLiveRegion="polite" style={styles.purchaseStatus}>
                    {purchaseState.message}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {typeof restorePurchases === 'function' ? (
              <View style={styles.restoreSection}>
                <Text style={styles.restoreTitle}>Already subscribed before?</Text>
                <Text style={styles.restoreText}>
                  Restore previous Google Play purchases on this account. Pro access is enabled only
                  after AttraVoya verifies your server plan status.
                </Text>
                <Pressable
                  accessibilityHint="Restores previous Google Play purchases and rechecks your server verified plan"
                  accessibilityRole="button"
                  disabled={billingPending}
                  onPress={() => void handleRestore()}
                  style={({ pressed }) => [
                    styles.restoreButton,
                    pressed && styles.buttonPressed,
                    billingPending && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.restoreButtonLabel}>
                    {restorePending ? 'Restoring…' : 'Restore purchases'}
                  </Text>
                </Pressable>
                {restoreState.message ? (
                  <Text accessibilityLiveRegion="polite" style={styles.purchaseStatus}>
                    {restoreState.message}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
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
          <Text style={styles.refreshLabel}>
            {query.isFetching ? 'Refreshing…' : 'Refresh status'}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

export default function MobileSubscriptionStatusScreen() {
  const { width } = useWindowDimensions();
  const pageGutter = getPageGutter(width);
  const billing = useMobileBilling();

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
            <MobileSubscriptionStatusContent
              loadOfferingCatalog={billing.loadOfferingCatalog}
              purchasePlan={billing.purchasePlan}
              restorePurchases={billing.restorePurchases}
            />
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
  offeringSection: {
    gap: spacing[3],
    borderTopColor: lightTheme.borderSubtle,
    borderTopWidth: 1,
    paddingTop: spacing[4],
  },
  offeringTitle: { color: lightTheme.textPrimary, fontSize: 16, fontWeight: '700' },
  offeringStatus: { color: lightTheme.textSecondary, fontSize: 15, lineHeight: 22 },
  offeringList: { gap: spacing[2] },
  offeringRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  offeringPlan: { gap: spacing[1] },
  offeringPeriod: { color: lightTheme.textSecondary, fontSize: 15, fontWeight: '600' },
  offeringPrice: { color: lightTheme.textPrimary, fontSize: 16, fontWeight: '700' },
  offeringNote: { color: lightTheme.textSecondary, fontSize: 13, lineHeight: 20 },
  purchaseStatus: { color: lightTheme.textPrimary, fontSize: 14, lineHeight: 21 },
  purchaseButton: {
    minHeight: interaction.minimumTargetSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.brandPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
  },
  purchaseButtonLabel: { color: lightTheme.surface, fontSize: 14, fontWeight: '700' },
  restoreSection: {
    gap: spacing[3],
    borderTopColor: lightTheme.borderSubtle,
    borderTopWidth: 1,
    paddingTop: spacing[4],
  },
  restoreTitle: { color: lightTheme.textPrimary, fontSize: 16, fontWeight: '700' },
  restoreText: { color: lightTheme.textSecondary, fontSize: 14, lineHeight: 21 },
  restoreButton: {
    minHeight: interaction.minimumTargetSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: lightTheme.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
  },
  restoreButtonLabel: { color: lightTheme.textPrimary, fontSize: 14, fontWeight: '700' },
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
