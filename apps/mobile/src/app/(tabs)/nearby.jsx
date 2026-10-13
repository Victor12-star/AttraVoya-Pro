import { colors, lightTheme, radius, spacing } from '@attravoya/design-tokens';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Decorative location photography. This screen does not request location access.
const nearbyImage = {
  uri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
};

const imageOverlay = 'rgba(0, 30, 67, 0.65)';

export default function NearbyScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>AROUND YOU</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Find more to love nearby.
        </Text>
        <Text style={styles.intro}>
          Great travel experiences can begin just around the corner.
        </Text>

        <View style={styles.hero}>
          <ImageBackground
            accessibilityIgnoresInvertColors
            imageStyle={styles.heroImage}
            resizeMode="cover"
            source={nearbyImage}
            style={styles.heroBackground}
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.heroEyebrow}>DISCOVER YOUR SURROUNDINGS</Text>
              <Text style={styles.heroTitle}>Adventure is closer than you think.</Text>
              <Text style={styles.heroBody}>
                Find places and experiences when location discovery is connected.
              </Text>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.statusCard}>
          <Text accessibilityRole="header" style={styles.statusTitle}>
            Nearby discovery is being connected
          </Text>
          <Text style={styles.statusBody}>
            This screen does not access your location yet. When nearby discovery is ready, it will
            ask for permission before using your position and handle unavailable services safely.
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Real places, verified information</Text>
          <Text style={styles.noticeBody}>
            Photography is illustrative. We do not show invented nearby businesses, opening hours
            or availability.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTheme.background },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[10],
  },
  eyebrow: {
    color: colors.info,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing[2],
  },
  title: {
    color: lightTheme.textPrimary,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
  },
  intro: {
    color: lightTheme.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing[3],
    marginBottom: spacing[5],
  },
  hero: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.ocean[700],
  },
  heroImage: { borderRadius: radius.xl },
  heroBackground: { minHeight: 325, justifyContent: 'flex-end' },
  heroOverlay: {
    padding: spacing[6],
    paddingTop: spacing[10],
    backgroundColor: imageOverlay,
  },
  heroEyebrow: {
    color: colors.ocean[100],
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    marginTop: spacing[3],
  },
  heroBody: {
    color: colors.ink[50],
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing[3],
  },
  statusCard: {
    marginTop: spacing[6],
    padding: spacing[5],
    borderRadius: radius.lg,
    backgroundColor: lightTheme.surfaceMuted,
  },
  statusTitle: {
    color: lightTheme.brandPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  statusBody: {
    color: lightTheme.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing[3],
  },
  notice: {
    marginTop: spacing[4],
    padding: spacing[5],
    borderRadius: radius.lg,
    backgroundColor: lightTheme.surface,
  },
  noticeTitle: {
    color: lightTheme.brandPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  noticeBody: {
    color: lightTheme.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing[3],
  },
});
