import { colors } from './colors.js';

/**
 * Semantic themes keep components independent of raw palette values. This is
 * what allows light/dark mode to evolve without rewriting every component.
 */
export const lightTheme = Object.freeze({
  background: colors.sand[50],
  surface: colors.white,
  surfaceElevated: colors.white,
  surfaceMuted: colors.ocean[50],
  textPrimary: colors.ink[950],
  textSecondary: colors.ink[600],
  textMuted: colors.ink[500],
  brandPrimary: colors.ocean[900],
  brandSecondary: colors.ocean[600],
  brandAccent: colors.coral[500],
  borderSubtle: colors.ink[100],
  borderStrong: colors.ink[300],
  focusRing: colors.ocean[500],
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
});

export const darkTheme = Object.freeze({
  background: '#071315',
  surface: '#0C1C1F',
  surfaceElevated: '#12272A',
  surfaceMuted: '#102327',
  textPrimary: '#F5F6F4',
  textSecondary: '#C7D1CF',
  textMuted: '#9BA9A7',
  brandPrimary: '#A9D2CD',
  brandSecondary: '#74AAA5',
  brandAccent: '#F28B72',
  borderSubtle: '#20373A',
  borderStrong: '#395256',
  focusRing: '#8EC0BC',
  success: '#6DB892',
  warning: '#E0AF67',
  danger: '#EE8989',
  info: '#80B5E5',
});

export const themes = Object.freeze({ light: lightTheme, dark: darkTheme });

export default themes;
