import { colors, interaction, lightTheme, radius, spacing } from '@attravoya/design-tokens';
import { router } from 'expo-router';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Editorial photography only. It does not imply bookable rooms or live fares.
const destinationImage = {
  uri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
};

const imageOverlay = 'rgba(0, 30, 67, 0.65)';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>DISCOVER</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Find a place worth exploring.
        </Text>
        <Text style={styles.description}>
          Explore inspiring places and nearby experiences as you plan your next trip.
        </Text>

        <View style={styles.hero}>
          <ImageBackground
            accessibilityIgnoresInvertColors
            imageStyle={styles.heroImage}
            resizeMode="cover"
            source={destinationImage}
            style={styles.heroBackground}
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.heroLabel}>TRAVEL INSPIRATION</Text>
              <Text style={styles.heroTitle}>Your next adventure starts with curiosity.</Text>
              <Text style={styles.heroBody}>
                Discover destinations, then plan around the budget that works for you.
              </Text>
            </View>
          </ImageBackground>
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Explore around you
        </Text>
        <Text style={styles.sectionBody}>
          Open the Nearby screen to discover places when location and provider results are
          available.
        </Text>
        <Pressable
          accessibilityLabel="Explore nearby places"
          accessibilityRole="button"
          onPress={() => router.push('/nearby')}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonLabel}>Explore nearby →</Text>
        </Pressable>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Travel information you can trust</Text>
          <Text style={styles.noticeBody}>
            Destination photography is illustrative. Live prices, room inventory and availability
            are not shown unless a connected provider confirms them.
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
  description: {
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
  heroBackground: { minHeight: 330, justifyContent: 'flex-end' },
  heroOverlay: {
    padding: spacing[6],
    paddingTop: spacing[10],
    backgroundColor: imageOverlay,
  },
  heroLabel: {
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
  sectionTitle: {
    color: lightTheme.textPrimary,
    fontSize: 23,
    fontWeight: '800',
    marginTop: spacing[7],
  },
  sectionBody: {
    color: lightTheme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  button: {
    minHeight: interaction.minimumTargetSize,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.info,
  },
  buttonLabel: { color: colors.white, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  notice: {
    marginTop: spacing[5],
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: lightTheme.surfaceMuted,
  },
  noticeTitle: {
    color: lightTheme.brandPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  noticeBody: {
    color: lightTheme.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing[2],
  },
});
