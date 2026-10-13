import { lightTheme, radius, spacing } from '@attravoya/design-tokens';
import { StyleSheet, Text, View } from 'react-native';

import ScaffoldScreen from '../../components/common/scaffold-screen.jsx';

export default function DestinationDetailScreen() {
  return (
    <ScaffoldScreen
      description="Destination details will appear here after verified content and provider-backed travel data are connected. Live availability and prices are not available on this screen yet."
      eyebrow="Destination"
      title="Destination details are not connected yet"
    >
      <View accessibilityRole="summary" style={styles.safetyNotice}>
        <Text accessibilityRole="header" style={styles.safetyTitle}>
          Destination safety and awareness
        </Text>
        <Text style={styles.safetyBody}>
          Current destination safety updates are temporarily unavailable. Check official travel
          advisories before departure.
        </Text>
        <Text style={styles.safetyFootnote}>
          No current news, advisory, or last-checked time has been verified for this destination.
        </Text>
      </View>
    </ScaffoldScreen>
  );
}

const styles = StyleSheet.create({
  safetyNotice: {
    backgroundColor: lightTheme.surfaceMuted,
    borderColor: lightTheme.borderSubtle,
    borderWidth: 1,
    borderRadius: radius.xl,
    marginTop: spacing[4],
    padding: spacing[6],
    gap: spacing[2],
  },
  safetyTitle: { color: lightTheme.textPrimary, fontSize: 17, fontWeight: '700' },
  safetyBody: { color: lightTheme.textSecondary, fontSize: 15, lineHeight: 23 },
  safetyFootnote: { color: lightTheme.textSecondary, fontSize: 13, lineHeight: 20 },
});
