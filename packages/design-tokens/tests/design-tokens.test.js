import { describe, expect, it } from 'vitest';

import { darkTheme, lightTheme, radius, spacing } from '../src/index.js';

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
});
