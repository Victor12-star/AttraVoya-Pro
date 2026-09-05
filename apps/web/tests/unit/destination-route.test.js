import { describe, expect, it } from 'vitest';

import {
  buildDestinationChildHref,
  buildDestinationContextHref,
  buildDestinationHref,
  createDestinationSlug,
  parseDestinationSelection,
} from '../../src/features/destinations/destination-route.js';

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

describe('destination route contract', () => {
  it('creates readable global slugs without discarding non-Latin destination names', () => {
    expect(createDestinationSlug({ name: 'São Paulo', countryCode: 'BR' })).toBe('sao-paulo-br');
    expect(createDestinationSlug({ name: '東京', countryCode: 'JP' })).toBe('東京-jp');
  });

  it('round-trips a normalized provider selection through a shareable URL', () => {
    const href = buildDestinationHref(stockholm);
    const url = new URL(href, 'https://attravoya.example');
    const parsed = parseDestinationSelection({
      slug: decodeURIComponent(url.pathname.split('/').at(-1)),
      searchParams: url.searchParams,
    });

    expect(url.pathname).toBe('/destinations/stockholm-se');
    expect(parsed).toEqual({ ...stockholm, slug: 'stockholm-se' });
  });

  it('rejects a mismatched slug or invalid coordinate instead of rendering altered data', () => {
    const url = new URL(buildDestinationHref(stockholm), 'https://attravoya.example');

    expect(
      parseDestinationSelection({ slug: 'gothenburg-se', searchParams: url.searchParams }),
    ).toBeNull();

    url.searchParams.set('lat', '190');
    expect(
      parseDestinationSelection({ slug: 'stockholm-se', searchParams: url.searchParams }),
    ).toBeNull();
  });

  it('preserves destination context for child and main feature entry points', () => {
    expect(buildDestinationChildHref(stockholm, 'safety')).toContain(
      '/destinations/stockholm-se/safety?',
    );
    expect(buildDestinationChildHref(stockholm, 'events')).toContain(
      '/destinations/stockholm-se/events?',
    );
    expect(buildDestinationChildHref(stockholm, 'news')).toContain(
      '/destinations/stockholm-se/news?',
    );
    expect(buildDestinationChildHref(stockholm, 'airports')).toContain(
      '/destinations/stockholm-se/airports?',
    );
    expect(buildDestinationChildHref(stockholm, 'hospitals')).toContain(
      '/destinations/stockholm-se/hospitals?',
    );
    expect(buildDestinationChildHref(stockholm, 'pharmacies')).toContain(
      '/destinations/stockholm-se/pharmacies?',
    );
    expect(buildDestinationChildHref(stockholm, 'police')).toContain(
      '/destinations/stockholm-se/police?',
    );
    expect(buildDestinationChildHref(stockholm, 'museums')).toContain(
      '/destinations/stockholm-se/museums?',
    );
    expect(buildDestinationChildHref(stockholm, 'restaurants')).toContain(
      '/destinations/stockholm-se/restaurants?',
    );
    expect(buildDestinationChildHref(stockholm, 'beaches')).toContain(
      '/destinations/stockholm-se/beaches?',
    );
    expect(buildDestinationChildHref(stockholm, 'shopping')).toContain(
      '/destinations/stockholm-se/shopping?',
    );
    expect(buildDestinationChildHref(stockholm, 'supermarkets')).toContain(
      '/destinations/stockholm-se/supermarkets?',
    );
    expect(buildDestinationChildHref(stockholm, 'transport')).toContain(
      '/destinations/stockholm-se/transport?',
    );
    expect(buildDestinationContextHref('/nearby', stockholm)).toContain('/nearby?');
    expect(buildDestinationContextHref('/nearby', stockholm)).toContain('destination=Stockholm');
  });
});
