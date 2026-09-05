import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNearbyPlaces: mocks.getNearbyPlaces },
}));

const { MuseumsDestinationPage } =
  await import('../../src/features/destinations/museums-page.jsx');

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

function museumsResponse(overrides = {}) {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T15:30:00.000Z',
      categoryGroup: 'museums',
      results: [
        {
          provider: 'geoapify',
          externalId: 'museum-1',
          name: 'Example Museum',
          formattedAddress: 'Museum Road, Stockholm County, Sweden',
          countryCode: 'SE',
          latitude: 59.34,
          longitude: 18.07,
          distanceMeters: 1800,
          website: 'https://museum.example/',
          exhibitions: 'Special exhibition',
          openingHours: 'Open 24 hours',
          ticketPrice: 'SEK 99',
          accessibility: 'Fully accessible',
          rating: '5 stars',
          availability: 'Tickets available',
        },
      ],
      ...overrides,
    },
  };
}

describe('MuseumsDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(museumsResponse());
  });

  it('loads nearby museums through the provider-neutral places API and renders only supported facts', async () => {
    render(<MuseumsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Museums near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Museum', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Museum Road, Stockholm County, Sweden')).toBeInTheDocument();
    expect(screen.getByText('1.8 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://museum.example/',
    );
    expect(screen.queryByText('Special exhibition')).not.toBeInTheDocument();
    expect(screen.queryByText('Open 24 hours')).not.toBeInTheDocument();
    expect(screen.queryByText('SEK 99')).not.toBeInTheDocument();
    expect(screen.queryByText('Fully accessible')).not.toBeInTheDocument();
    expect(screen.queryByText('5 stars')).not.toBeInTheDocument();
    expect(screen.queryByText('Tickets available')).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'museums',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 15000,
      limit: 24,
      language: 'en',
    });
  });

  it('rejects mismatched-country and provider rows and hides unsafe websites', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(
      museumsResponse({
        results: [
          {
            provider: 'geoapify',
            externalId: 'wrong-country',
            name: 'Wrong Country Museum',
            countryCode: 'US',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 1000,
          },
          {
            provider: 'other-provider',
            externalId: 'wrong-provider',
            name: 'Wrong Provider Museum',
            countryCode: 'SE',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 1500,
          },
          {
            provider: 'geoapify',
            externalId: 'safe-museum',
            name: 'Safe Museum',
            countryCode: 'SE',
            latitude: 59.35,
            longitude: 18.15,
            distanceMeters: 2000,
            website: 'javascript:alert(1)',
          },
        ],
      }),
    );

    render(<MuseumsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Safe Museum', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country Museum')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong Provider Museum')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no matching museums are returned', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(museumsResponse({ results: [] }));

    render(<MuseumsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByText('No museums were found in this search area.')).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('provider secret details must not leak'))
      .mockResolvedValueOnce(museumsResponse());

    render(<MuseumsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Museums could not be loaded right now.',
    );
    expect(screen.queryByText(/provider secret details/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Example Museum', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the places provider', async () => {
    render(<MuseumsDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
