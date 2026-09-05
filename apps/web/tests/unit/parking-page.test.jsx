import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNearbyPlaces: mocks.getNearbyPlaces },
}));

const { ParkingDestinationPage } = await import(
  '../../src/features/destinations/parking-page.jsx',
);

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

function parkingResponse(overrides = {}) {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T18:00:00.000Z',
      categoryGroup: 'parking',
      results: [
        {
          provider: 'geoapify',
          externalId: 'parking-1',
          name: 'Example Parking',
          formattedAddress: 'Park Street, Stockholm County, Sweden',
          countryCode: 'SE',
          latitude: 59.333,
          longitude: 18.075,
          distanceMeters: 800,
          website: 'https://parking.example/location',
          availability: 'Spaces available',
          occupancy: '20 spaces free',
          price: 'SEK 50/hour',
          restrictions: 'Residents only',
          permit: 'Permit required',
          paymentMethods: 'Card accepted',
          openingHours: 'Open 24/7',
          reservation: 'Bookable',
          evCharging: 'EV charging available',
          heightLimit: '2.0 m limit',
          security: 'Guarded',
          accessibility: 'Accessible spaces',
        },
      ],
      ...overrides,
    },
  };
}

describe('ParkingDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(parkingResponse());
  });

  it('loads nearby parking through the provider-neutral places API and renders only supported location facts', async () => {
    render(
      <ParkingDestinationPage destination={destination} locale="en" messages={messages} />,
    );

    expect(
      screen.getByRole('heading', { name: 'Parking near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Parking', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Park Street, Stockholm County, Sweden')).toBeInTheDocument();
    expect(screen.getByText('800 m')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://parking.example/location',
    );

    expect(screen.queryByText('Spaces available')).not.toBeInTheDocument();
    expect(screen.queryByText('20 spaces free')).not.toBeInTheDocument();
    expect(screen.queryByText('SEK 50/hour')).not.toBeInTheDocument();
    expect(screen.queryByText('Residents only')).not.toBeInTheDocument();
    expect(screen.queryByText('Permit required')).not.toBeInTheDocument();
    expect(screen.queryByText('Card accepted')).not.toBeInTheDocument();
    expect(screen.queryByText('Open 24/7')).not.toBeInTheDocument();
    expect(screen.queryByText('Bookable')).not.toBeInTheDocument();
    expect(screen.queryByText('EV charging available')).not.toBeInTheDocument();
    expect(screen.queryByText('2.0 m limit')).not.toBeInTheDocument();
    expect(screen.queryByText('Guarded')).not.toBeInTheDocument();
    expect(screen.queryByText('Accessible spaces')).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'parking',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 10000,
      limit: 24,
      language: 'en',
    });
  });

  it('rejects mismatched-country and provider rows and hides unsafe websites', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(
      parkingResponse({
        results: [
          {
            provider: 'geoapify',
            externalId: 'wrong-country',
            name: 'Wrong Country Parking',
            countryCode: 'NO',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 700,
          },
          {
            provider: 'other-provider',
            externalId: 'wrong-provider',
            name: 'Wrong Provider Parking',
            countryCode: 'SE',
            latitude: 59.31,
            longitude: 18.11,
            distanceMeters: 800,
          },
          {
            provider: 'geoapify',
            externalId: 'safe-parking',
            name: 'Safe Parking',
            countryCode: 'SE',
            latitude: 59.32,
            longitude: 18.12,
            distanceMeters: 900,
            website: 'javascript:alert(1)',
          },
        ],
      }),
    );

    render(
      <ParkingDestinationPage destination={destination} locale="en" messages={messages} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Safe Parking', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country Parking')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong Provider Parking')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no matching parking places are returned', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(parkingResponse({ results: [] }));

    render(
      <ParkingDestinationPage destination={destination} locale="en" messages={messages} />,
    );

    expect(
      await screen.findByText('No parking places were found in this search area.'),
    ).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret parking provider detail'))
      .mockResolvedValueOnce(parkingResponse());

    render(
      <ParkingDestinationPage destination={destination} locale="en" messages={messages} />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Parking places could not be loaded right now.',
    );
    expect(screen.queryByText(/secret parking provider detail/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Example Parking', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the places provider', async () => {
    render(<ParkingDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
