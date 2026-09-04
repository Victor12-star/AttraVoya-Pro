import { describe, expect, it, vi } from 'vitest';

import {
  createDestinationOverviewService,
  DESTINATION_SECTION_STATUS,
} from './destination-overview.service.js';

function query() {
  return {
    name: 'Stockholm',
    countryCode: 'SE',
    latitude: 59.3293,
    longitude: 18.0686,
    language: 'en',
  };
}

describe('destination overview service', () => {
  it('loads independent provider sections using normalized destination coordinates', async () => {
    const getForecast = vi.fn(async () => ({
      provider: 'weather-test',
      fetchedAt: '2026-09-04T12:00:00.000Z',
      current: { temperatureC: 19 },
    }));
    const searchNearby = vi.fn(async ({ categoryGroup }) => ({
      provider: 'places-test',
      fetchedAt: '2026-09-04T12:00:00.000Z',
      categoryGroup,
      results: [{ externalId: `${categoryGroup}-1`, name: 'Result' }],
    }));
    const searchPhotos = vi.fn(async () => ({
      provider: 'images-test',
      fetchedAt: '2026-09-04T12:00:00.000Z',
      photos: [{ externalId: 'photo-1' }],
    }));

    const service = createDestinationOverviewService({
      weatherProvider: { getForecast },
      placesProvider: { searchNearby },
      imageProvider: { searchPhotos },
    });
    const overview = await service.getOverview(query());

    expect(overview.destination).toEqual({
      name: 'Stockholm',
      countryCode: 'SE',
      latitude: 59.3293,
      longitude: 18.0686,
    });
    expect(overview.sections.weather.status).toBe(DESTINATION_SECTION_STATUS.AVAILABLE);
    expect(overview.sections.attractions.status).toBe(DESTINATION_SECTION_STATUS.AVAILABLE);
    expect(overview.sections.restaurants.status).toBe(DESTINATION_SECTION_STATUS.AVAILABLE);
    expect(overview.sections.images.status).toBe(DESTINATION_SECTION_STATUS.AVAILABLE);
    expect(getForecast).toHaveBeenCalledWith({
      latitude: 59.3293,
      longitude: 18.0686,
      forecastDays: 5,
      timezone: 'auto',
    });
    expect(searchPhotos).toHaveBeenCalledWith({
      query: 'Stockholm SE travel',
      orientation: 'landscape',
      locale: 'en',
      perPage: 3,
    });
  });

  it('keeps healthy sections available when one external provider fails', async () => {
    const service = createDestinationOverviewService({
      weatherProvider: {
        getForecast: async () => ({ provider: 'weather-test', current: { temperatureC: 17 } }),
      },
      placesProvider: {
        searchNearby: async ({ categoryGroup }) => {
          if (categoryGroup === 'attractions') throw new Error('Geoapify unavailable');
          return { provider: 'places-test', categoryGroup, results: [] };
        },
      },
      imageProvider: {
        searchPhotos: async () => {
          throw new Error('Pexels key missing');
        },
      },
    });

    const overview = await service.getOverview(query());

    expect(overview.sections.weather.status).toBe(DESTINATION_SECTION_STATUS.AVAILABLE);
    expect(overview.sections.attractions).toEqual({
      status: DESTINATION_SECTION_STATUS.UNAVAILABLE,
      provider: null,
      fetchedAt: null,
      data: null,
    });
    expect(overview.sections.restaurants.status).toBe(DESTINATION_SECTION_STATUS.EMPTY);
    expect(overview.sections.images.status).toBe(DESTINATION_SECTION_STATUS.UNAVAILABLE);
    expect(JSON.stringify(overview)).not.toContain('Geoapify unavailable');
    expect(JSON.stringify(overview)).not.toContain('Pexels key missing');
  });
});
