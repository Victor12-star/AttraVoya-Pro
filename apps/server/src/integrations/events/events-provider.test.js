import { describe, expect, it, vi } from 'vitest';

import { ProviderAuthenticationError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createTicketmasterEventsProvider } from './ticketmaster-events-provider.js';

const payload = {
  _embedded: {
    events: [
      {
        id: 'event-1',
        name: 'Stockholm Live',
        url: 'https://example.test/event-1',
        locale: 'en-us',
        dates: {
          start: {
            dateTime: '2026-10-10T18:00:00Z',
            localDate: '2026-10-10',
            localTime: '20:00:00',
          },
          timezone: 'Europe/Stockholm',
          status: { code: 'onsale' },
        },
        classifications: [
          {
            segment: { name: 'Music' },
            genre: { name: 'Rock' },
            subGenre: { name: 'Pop Rock' },
          },
        ],
        images: [
          { url: 'https://example.test/small.jpg', width: 100, height: 50, ratio: '16_9' },
          { url: 'https://example.test/large.jpg', width: 1000, height: 560, ratio: '16_9' },
        ],
        _embedded: {
          venues: [
            {
              id: 'venue-1',
              name: 'Arena',
              city: { name: 'Stockholm' },
              country: { name: 'Sweden', countryCode: 'SE' },
              address: { line1: 'Example street 1' },
              location: { latitude: '59.3293', longitude: '18.0686' },
            },
          ],
        },
      },
    ],
  },
  page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
};

describe('Ticketmaster events adapter', () => {
  it('normalizes and caches event responses without inventing missing fields', async () => {
    const http = { requestJson: vi.fn().mockResolvedValue(payload) };
    const provider = createTicketmasterEventsProvider({
      http,
      apiKey: 'test-key',
      cache: createProviderCache(),
      cacheTtlSeconds: 600,
    });

    const query = { city: 'Stockholm', countryCode: 'SE', size: 20, page: 0, locale: 'en' };
    const first = await provider.searchEvents(query);
    const second = await provider.searchEvents(query);

    expect(first.events).toHaveLength(1);
    expect(first.events[0].name).toBe('Stockholm Live');
    expect(first.events[0].venue.countryCode).toBe('SE');
    expect(first.events[0].venue.latitude).toBe(59.3293);
    expect(first.events[0].classifications[0].genre).toBe('Rock');
    expect(first.events[0].image.url).toBe('https://example.test/large.jpg');
    expect(first.events[0].price).toBeUndefined();
    expect(second).toEqual(first);
    expect(http.requestJson).toHaveBeenCalledTimes(1);
  });

  it('returns a stable empty result when Ticketmaster has no events', async () => {
    const provider = createTicketmasterEventsProvider({
      http: { requestJson: vi.fn().mockResolvedValue({ page: { totalElements: 0 } }) },
      apiKey: 'test-key',
      cache: createProviderCache(),
    });

    const result = await provider.searchEvents({ countryCode: 'SE' });
    expect(result.events).toEqual([]);
    expect(result.page.totalElements).toBe(0);
  });

  it('fails before making a request when the API key is missing', async () => {
    const http = { requestJson: vi.fn() };
    const provider = createTicketmasterEventsProvider({
      http,
      apiKey: '',
      cache: createProviderCache(),
    });

    await expect(provider.searchEvents({ countryCode: 'SE' })).rejects.toBeInstanceOf(
      ProviderAuthenticationError,
    );
    expect(http.requestJson).not.toHaveBeenCalled();
  });

  it('uses Ticketmaster geoPoint instead of the deprecated latlong parameter', async () => {
    const http = { requestJson: vi.fn().mockResolvedValue({}) };
    const provider = createTicketmasterEventsProvider({
      http,
      apiKey: 'test-key',
      cache: createProviderCache(),
    });

    await provider.searchEvents({
      latitude: 59.3293,
      longitude: 18.0686,
      radius: 10,
      unit: 'km',
    });

    const requestedUrl = http.requestJson.mock.calls[0][0];
    expect(requestedUrl.searchParams.has('geoPoint')).toBe(true);
    expect(requestedUrl.searchParams.has('latlong')).toBe(false);
    expect(requestedUrl.searchParams.get('radius')).toBe('10');
  });
});
