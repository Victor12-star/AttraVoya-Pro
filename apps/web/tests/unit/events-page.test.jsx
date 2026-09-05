import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getEvents: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getEvents: mocks.getEvents },
}));

const { EventsDestinationPage } = await import('../../src/features/destinations/events-page.jsx');

const messages = {
  common: { loading: 'Loading…', unavailable: 'Temporarily unavailable', retry: 'Retry' },
  home: { exploreCta: 'Explore destinations' },
};

const destination = {
  provider: 'geoapify',
  externalId: 'place-stockholm',
  name: 'Stockholm',
  state: 'Stockholm County',
  countryCode: 'SE',
  countryDisplayName: 'Sweden',
  latitude: 59.3293,
  longitude: 18.0686,
  timeZone: 'Europe/Stockholm',
  slug: 'stockholm-se',
};

function eventResponse(overrides = {}) {
  return {
    events: {
      provider: 'ticketmaster',
      fetchedAt: '2026-09-05T08:00:00.000Z',
      events: [
        {
          provider: 'ticketmaster',
          externalId: 'event-1',
          name: 'Stockholm Live',
          url: 'https://www.ticketmaster.se/event/event-1',
          price: 'SEK 999',
          start: {
            dateTime: '2026-10-10T18:00:00Z',
            localDate: '2026-10-10',
            localTime: '20:00:00',
            timezone: 'Europe/Stockholm',
            dateTbd: false,
            dateTba: false,
            timeTba: false,
          },
          venue: {
            name: 'Arena',
            address: 'Example street 1',
            city: 'Stockholm',
            countryCode: 'SE',
          },
          classifications: [{ segment: 'Music', genre: 'Rock' }],
        },
      ],
      page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
      ...overrides,
    },
  };
}

describe('EventsDestinationPage', () => {
  beforeEach(() => {
    mocks.getEvents.mockReset();
    mocks.getEvents.mockResolvedValue(eventResponse());
  });

  it('loads provider events near the destination and renders only normalized factual fields', async () => {
    render(<EventsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Events near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Stockholm Live', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Oct 10, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Arena · Example street 1 · Stockholm/)).toBeInTheDocument();
    expect(screen.getByText('Music · Rock')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Event details' })).toHaveAttribute(
      'href',
      'https://www.ticketmaster.se/event/event-1',
    );
    expect(screen.queryByText('SEK 999')).not.toBeInTheDocument();

    expect(mocks.getEvents).toHaveBeenCalledWith({
      countryCode: 'SE',
      latitude: 59.3293,
      longitude: 18.0686,
      radius: 50,
      unit: 'km',
      locale: 'en',
      size: 20,
      page: 0,
      sort: 'date,asc',
    });
  });

  it('rejects mismatched-country rows and hides unsafe provider URLs', async () => {
    mocks.getEvents.mockResolvedValue(
      eventResponse({
        events: [
          {
            provider: 'ticketmaster',
            externalId: 'wrong-country',
            name: 'Wrong Country Event',
            url: 'https://example.test/wrong',
            start: { localDate: '2026-10-11' },
            venue: { countryCode: 'US' },
            classifications: [],
          },
          {
            provider: 'ticketmaster',
            externalId: 'safe-row',
            name: 'Safe Event',
            url: 'javascript:alert(1)',
            start: { localDate: '2026-10-12' },
            venue: { name: 'Central Hall', countryCode: 'SE' },
            classifications: [],
          },
        ],
      }),
    );

    render(<EventsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Safe Event', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country Event')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Event details' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when the provider returns no events', async () => {
    mocks.getEvents.mockResolvedValue(eventResponse({ events: [] }));

    render(<EventsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No events were returned for this destination area.'),
    ).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getEvents
      .mockRejectedValueOnce(new Error('provider internals must not leak'))
      .mockResolvedValueOnce(eventResponse());

    render(<EventsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByText('Events could not be loaded right now.')).toBeInTheDocument();
    expect(screen.queryByText(/provider internals/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getEvents).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Stockholm Live', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the provider', () => {
    render(<EventsDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });
});
