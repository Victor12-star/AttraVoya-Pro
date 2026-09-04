import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

/**
 * Neutral placeholder for mobile routes that are not connected yet.
 * It keeps Expo Router valid without inventing travel data or functionality.
 */
export default function ScaffoldScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.brand}>
          AttraVoya Pro
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    fontSize: 24,
    fontWeight: '700',
  },
});
