import { colors, interaction, lightTheme, radius, spacing } from '@attravoya/design-tokens';
import { router } from 'expo-router';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Decorative destination photography: no inferred travel pricing or availability.
// The underlying brand color remains visible if the image cannot be loaded.
const HERO_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
};

const heroOverlay = 'rgba(0, 30, 67, 0.65)';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>
          AttraVoya <Text style={styles.brandAccent}>Pro</Text>
        </Text>
        <Text style={styles.subtitle}>Plan smarter. Travel further.</Text>

        <View style={styles.hero}>
          <ImageBackground
            accessibilityIgnoresInvertColors
            imageStyle={styles.heroImage}
            resizeMode="cover"
            source={HERO_IMAGE}
            style={styles.heroImageContainer}
          >
            <View style={styles.heroShade}>
              <Text style={styles.heroEyebrow}>YOUR NEXT ADVENTURE</Text>
              <Text accessibilityRole="header" style={styles.heroTitle}>
                Explore the world on your budget.
              </Text>
              <Text style={styles.heroDescription}>
                Tell us what matters to you. Build a travel plan that puts your budget first.
              </Text>
            </View>
          </ImageBackground>
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Where will you go next?
        </Text>
        <Text style={styles.sectionDescription}>
          Discover places, plan a trip, or revisit your saved plans.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore destinations"
          onPress={() => router.push('/explore')}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Explore destinations  →</Text>
        </Pressable>

        <View style={styles.quickActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open my trips"
            onPress={() => router.push('/trips')}
            style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
          >
            <Text style={styles.quickTitle}>My trips</Text>
            <Text style={styles.quickDescription}>Return to your travel plans</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore nearby places"
            onPress={() => router.push('/nearby')}
            style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
          >
            <Text style={styles.quickTitle}>Nearby</Text>
            <Text style={styles.quickDescription}>Discover places around you</Text>
          </Pressable>
        </View>

        <View style={styles.transparencyNote}>
          <Text style={styles.noteTitle}>Plan with confidence</Text>
          <Text style={styles.noteText}>
            Live prices and booking availability appear only when verified by connected providers.
            Other trip costs will be clearly labelled as estimates.
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
  brand: { color: lightTheme.brandPrimary, fontSize: 26, fontWeight: '800' },
  brandAccent: { color: colors.info },
  subtitle: {
    color: lightTheme.textSecondary,
    fontSize: 14,
    marginTop: spacing[1],
    marginBottom: spacing[5],
  },
  hero: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.ocean[700],
  },
  heroImageContainer: { minHeight: 330, justifyContent: 'flex-end' },
  heroImage: { borderRadius: radius.xl },
  heroShade: {
    padding: spacing[6],
    paddingTop: spacing[10],
    backgroundColor: heroOverlay,
  },
  heroEyebrow: {
    color: colors.ocean[100],
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing[3],
  },
  heroTitle: {
    color: colors.white,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '800',
    marginBottom: spacing[3],
  },
  heroDescription: { color: colors.ink[50], fontSize: 16, lineHeight: 23 },
  sectionTitle: {
    color: lightTheme.textPrimary,
    fontSize: 23,
    fontWeight: '800',
    marginTop: spacing[7],
  },
  sectionDescription: {
    color: lightTheme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing[2],
    marginBottom: spacing[5],
  },
  primaryButton: {
    minHeight: interaction.minimumTargetSize,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  quickActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  quickAction: {
    flex: 1,
    minHeight: 112,
    backgroundColor: lightTheme.surface,
    borderWidth: 1,
    borderColor: lightTheme.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing[4],
    justifyContent: 'center',
  },
  quickTitle: { color: lightTheme.brandPrimary, fontSize: 17, fontWeight: '700' },
  quickDescription: {
    color: lightTheme.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing[2],
  },
  transparencyNote: {
    backgroundColor: lightTheme.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginTop: spacing[5],
  },
  noteTitle: {
    color: lightTheme.brandPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  noteText: {
    color: lightTheme.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing[2],
  },
});
