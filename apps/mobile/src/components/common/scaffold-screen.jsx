import {
  contentWidths,
  getPageGutter,
  interaction,
  lightTheme,
  radius,
  spacing,
  typography,
} from '@attravoya/design-tokens';
import { SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

/**
 * Truthful foundation state for routes that are not connected yet. Keeping this
 * explicit prevents unfinished screens from suggesting that live travel data
 * has already been retrieved.
 *
 * @param {{description: string, eyebrow: string, title: string}} props
 */
export default function ScaffoldScreen({ description, eyebrow, title }) {
  const { width } = useWindowDimensions();
  const pageGutter = getPageGutter(width);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageGutter }]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          <View accessibilityRole="summary" style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>Feature foundation</Text>
          </View>

          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Built for reliable travel planning</Text>
            <Text style={styles.noticeBody}>
              This area is being connected in verified stages. Live availability and prices will
              only be shown after a provider confirms them.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: lightTheme.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing[10],
    paddingTop: spacing[8],
  },
  content: {
    width: '100%',
    maxWidth: contentWidths.reading,
  },
  statusBadge: {
    minHeight: interaction.minimumTargetSize,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: lightTheme.surfaceMuted,
    borderColor: lightTheme.borderSubtle,
    borderWidth: 1,
    borderRadius: radius.pill,
    marginBottom: spacing[6],
    paddingHorizontal: spacing[4],
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: lightTheme.brandAccent,
    borderRadius: radius.pill,
  },
  statusLabel: {
    color: lightTheme.brandPrimary,
    fontSize: 14,
    fontWeight: String(typography.weight.semibold),
  },
  eyebrow: {
    color: lightTheme.brandSecondary,
    fontSize: 14,
    fontWeight: String(typography.weight.bold),
    letterSpacing: 1.2,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  title: {
    color: lightTheme.textPrimary,
    fontSize: 36,
    fontWeight: String(typography.weight.bold),
    letterSpacing: -0.8,
    lineHeight: 42,
    marginBottom: spacing[4],
  },
  description: {
    color: lightTheme.textSecondary,
    fontSize: 18,
    lineHeight: 28,
  },
  notice: {
    gap: spacing[2],
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.borderSubtle,
    borderWidth: 1,
    borderRadius: radius.xl,
    marginTop: spacing[8],
    padding: spacing[6],
  },
  noticeTitle: {
    color: lightTheme.textPrimary,
    fontSize: 17,
    fontWeight: String(typography.weight.semibold),
  },
  noticeBody: {
    color: lightTheme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
});
