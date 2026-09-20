import { interaction, lightTheme, spacing } from '@attravoya/design-tokens';
import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { tabRoutes } from '../../components/navigation/tab-routes.js';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        sceneStyle: styles.scene,
        tabBarActiveTintColor: lightTheme.brandPrimary,
        tabBarInactiveTintColor: lightTheme.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      }}
    >
      {tabRoutes.map(({ accessibilityLabel, label, name, symbol }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarAccessibilityLabel: accessibilityLabel,
            tabBarIcon: ({ color, focused }) => (
              <Text
                accessible={false}
                importantForAccessibility="no"
                style={[styles.tabSymbol, { color }, focused && styles.tabSymbolActive]}
              >
                {symbol}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: lightTheme.background,
  },
  tabBar: {
    minHeight: 72,
    backgroundColor: lightTheme.surface,
    borderTopColor: lightTheme.borderSubtle,
    paddingBottom: spacing[2],
    paddingTop: spacing[1],
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabSymbol: {
    minWidth: interaction.minimumTargetSize,
    minHeight: 28,
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
  },
  tabSymbolActive: {
    fontWeight: '700',
  },
});
