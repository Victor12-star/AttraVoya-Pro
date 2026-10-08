import {
  contentWidths,
  getPageGutter,
  lightTheme,
  radius,
  spacing,
} from '@attravoya/design-tokens';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmergencyScreen() {
  const { width } = useWindowDimensions();
  const pageGutter = getPageGutter(width);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageGutter }]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          <Text style={styles.eyebrow}>SAFETY</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Emergency assistance is not connected yet
          </Text>

          <View accessibilityLiveRegion="polite" style={styles.warning}>
            <Text style={styles.warningTitle}>Do not rely on AttraVoya for an emergency call.</Text>
            <Text style={styles.warningBody}>
              This screen does not contact emergency services, send an SOS message, or share your
              location.
            </Text>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>If you are in immediate danger</Text>
            <Text style={styles.noticeBody}>
              Use your phone&apos;s emergency calling feature or call the local emergency number for
              the country you are currently in.
            </Text>
          </View>

          <Text style={styles.description}>
            Verified emergency and travel-safety features can be added here later, but they will
            only be presented as available after the real service is connected and tested.
          </Text>
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
  eyebrow: {
    color: lightTheme.danger,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing[2],
  },
  title: {
    color: lightTheme.textPrimary,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    marginBottom: spacing[6],
  },
  warning: {
    gap: spacing[2],
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.danger,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[6],
  },
  warningTitle: {
    color: lightTheme.danger,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
  },
  warningBody: {
    color: lightTheme.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
  notice: {
    gap: spacing[2],
    backgroundColor: lightTheme.surfaceMuted,
    borderRadius: radius.xl,
    marginTop: spacing[5],
    padding: spacing[6],
  },
  noticeTitle: {
    color: lightTheme.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  noticeBody: {
    color: lightTheme.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  description: {
    color: lightTheme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing[6],
  },
});
