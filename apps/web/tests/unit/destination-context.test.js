import { describe, expect, it } from 'vitest';

import { parseDestinationContext } from '../../src/features/destinations/destination-context.js';
import { buildDestinationContextHref } from '../../src/features/destinations/destination-route.js';

const stockholm = {
  provider: 'geoapify',
  externalId: 'place-stockholm',
  name: 'Stockholm',
  state: 'Stockholm County',
  countryCode: 'SE',
  latitude: 59.3293,
  longitude: 18.0686,
  timeZone: 'Europe/Stockholm',
};

describe('destination feature context', () => {
  it('round-trips destination context into a top-level feature route', () => {
    const href = buildDestinationContextHref('/accommodation', stockholm);
    const url = new URL(href, 'https://attravoya.example');

    expect(parseDestinationContext(url.searchParams)).toEqual({
      ...stockholm,
      slug: 'stockholm-se',
    });
  });

  it('rejects a conflicting destination label and malformed coordinates', () => {
    const url = new URL(
      buildDestinationContextHref('/accommodation', stockholm),
      'https://attravoya.example',
    );

    url.searchParams.set('destination', 'Gothenburg');
    expect(parseDestinationContext(url.searchParams)).toBeNull();

    url.searchParams.set('destination', 'Stockholm');
    url.searchParams.set('lng', '500');
    expect(parseDestinationContext(url.searchParams)).toBeNull();
  });
});
