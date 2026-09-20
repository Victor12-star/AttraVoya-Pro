import { describe, expect, it } from 'vitest';

import {
  darkTheme,
  getPageGutter,
  getWindowSizeClass,
  interaction,
  lightTheme,
  pageGutters,
  radius,
  spacing,
  windowBreakpoints,
} from '../src/index.js';

describe('AttraVoya design tokens', () => {
  it('keeps semantic light and dark theme keys aligned', () => {
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(lightTheme).sort());
  });

  it('uses a monotonic core spacing scale', () => {
    expect(spacing[4]).toBeGreaterThan(spacing[3]);
    expect(spacing[8]).toBeGreaterThan(spacing[6]);
  });

  it('provides a pill radius for chips and compact controls', () => {
    expect(radius.pill).toBeGreaterThan(100);
  });

  it.each([
    [-1, 'compact'],
    [0, 'compact'],
    [windowBreakpoints.medium - 1, 'compact'],
    [windowBreakpoints.medium, 'medium'],
    [windowBreakpoints.expanded, 'expanded'],
    [windowBreakpoints.large, 'large'],
    [Number.NaN, 'compact'],
  ])('classifies width %s as %s', (width, expected) => {
    expect(getWindowSizeClass(width)).toBe(expected);
  });

  it('increases gutters without tying layout to a device name', () => {
    expect(getPageGutter(320)).toBe(pageGutters.compact);
    expect(getPageGutter(700)).toBe(pageGutters.medium);
    expect(getPageGutter(1_000)).toBe(pageGutters.expanded);
  });

  it('keeps every interactive control comfortably touch accessible', () => {
    expect(interaction.minimumTargetSize).toBeGreaterThanOrEqual(48);
    expect(interaction.minimumControlHeight).toBeGreaterThanOrEqual(interaction.minimumTargetSize);
  });
});
