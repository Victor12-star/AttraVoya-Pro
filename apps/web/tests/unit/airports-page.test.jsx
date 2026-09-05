import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNearbyPlaces: mocks.getNearbyPlaces },
}));

const { AirportsDestinationPage } =
  await import('../../src/features/destinations/airports-page.jsx');

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

function airportsResponse(overrides = {}) {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T13:00:00.000Z',
      categoryGroup: 'airports',
      results: [
        {
          provider: 'geoapify',
          externalId: 'airport-1',
          name: 'Example Airport',
          formattedAddress: 'Airport Road, Stockholm County, Sweden',
          countryCode: 'SE',
          latitude: 59.4,
          longitude: 17.9,
          distanceMeters: 12400,
          website: 'https://airport.example/',
          iataCode: 'FAK',
          terminal: 'Terminal 9',
          fare: 'SEK 99',
          liveFlights: 'On time',
        },
      ],
      ...overrides,
    },
  };
}

describe('AirportsDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(airportsResponse());
  });

  it('loads nearby airports through the provider-neutral places API and renders only supported facts', async () => {
    render(<AirportsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Airports near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Airport', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Airport Road, Stockholm County, Sweden')).toBeInTheDocument();
    expect(screen.getByText('12.4 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://airport.example/',
    );
    expect(screen.queryByText('FAK')).not.toBeInTheDocument();
    expect(screen.queryByText('Terminal 9')).not.toBeInTheDocument();
    expect(screen.queryByText('SEK 99')).not.toBeInTheDocument();
    expect(screen.queryByText('On time')).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'airports',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 50000,
      limit: 20,
      language: 'en',
    });
  });

  it('rejects mismatched-country and provider rows and hides unsafe websites', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(
      airportsResponse({
        results: [
          {
            provider: 'geoapify',
            externalId: 'wrong-country',
            name: 'Wrong Country Airport',
            countryCode: 'US',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 1000,
          },
          {
            provider: 'other-provider',
            externalId: 'wrong-provider',
            name: 'Wrong Provider Airport',
            countryCode: 'SE',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 1500,
          },
          {
            provider: 'geoapify',
            externalId: 'safe-airport',
            name: 'Safe Airport',
            countryCode: 'SE',
            latitude: 59.35,
            longitude: 18.15,
            distanceMeters: 2000,
            website: 'javascript:alert(1)',
          },
        ],
      }),
    );

    render(<AirportsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Safe Airport', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country Airport')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong Provider Airport')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no matching airports are returned', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(airportsResponse({ results: [] }));

    render(<AirportsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No airports were found in this search area.'),
    ).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('provider secret details must not leak'))
      .mockResolvedValueOnce(airportsResponse());

    render(<AirportsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Airports could not be loaded right now.',
    );
    expect(screen.queryByText(/provider secret details/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Example Airport', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the places provider', async () => {
    render(<AirportsDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
