import { describe, expect, it } from 'vitest';
import { PLACE_CATEGORY_GROUPS as GROUPS } from '@attravoya/constants';

import { PLACE_CATEGORY_GROUPS } from './place-categories.js';

describe('Geoapify place category groups', () => {
  it('maps the provider-neutral beaches group to the verified Geoapify beach category', () => {
    expect(GROUPS.BEACHES).toBe('beaches');
    expect(PLACE_CATEGORY_GROUPS[GROUPS.BEACHES]).toEqual(['beach']);
  });

  it('maps the provider-neutral embassy group to Geoapify diplomatic facilities', () => {
    expect(GROUPS.EMBASSIES).toBe('embassies');
    expect(PLACE_CATEGORY_GROUPS[GROUPS.EMBASSIES]).toEqual(['office.government.embassy']);
  });
});