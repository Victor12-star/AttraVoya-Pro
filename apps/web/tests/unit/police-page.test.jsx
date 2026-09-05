import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNearbyPlaces: mocks.getNearbyPlaces },
}));

const { PoliceDestinationPage } = await import('../../src/features/destinations/police-page.jsx');

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

function policeResponse(overrides = {}) {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T14:00:00.000Z',
      categoryGroup: 'police',
      results: [
        {
          provider: 'geoapify',
          externalId: 'police-1',
          name: 'Example Police Station',
          formattedAddress: 'Police Road, Stockholm County, Sweden',
          countryCode: 'SE',
          latitude: 59.338,
          longitude: 18.074,
          distanceMeters: 1100,
          website: 'https://police.example/',
          stationType: 'Emergency station',
          openingStatus: 'Open now',
          staffing: 'Fully staffed',
          responseAvailability: 'Immediate response available',
          phoneAvailability: 'Phone answered 24/7',
          emergencyHandling: 'Handles all emergencies',
          walkInAvailability: 'Walk-ins accepted now',
        },
      ],
      ...overrides,
    },
  };
}

describe('PoliceDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(policeResponse());
  });

  it('loads nearby police places through the provider-neutral places API and renders only supported location facts', async () => {
    render(<PoliceDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Police stations near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Police Station', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Police Road, Stockholm County, Sweden')).toBeInTheDocument();
    expect(screen.getByText('1.1 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://police.example/',
    );
    expect(screen.getByRole('link', { name: 'Verified emergency contacts' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/safety?'),
    );

    expect(screen.queryByText('Emergency station')).not.toBeInTheDocument();
    expect(screen.queryByText('Open now')).not.toBeInTheDocument();
    expect(screen.queryByText('Fully staffed')).not.toBeInTheDocument();
    expect(screen.queryByText('Immediate response available')).not.toBeInTheDocument();
    expect(screen.queryByText('Phone answered 24/7')).not.toBeInTheDocument();
    expect(screen.queryByText('Handles all emergencies')).not.toBeInTheDocument();
    expect(screen.queryByText('Walk-ins accepted now')).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'police',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 15000,
      limit: 20,
      language: 'en',
    });
  });

  it('rejects mismatched-country and provider rows and hides unsafe websites', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(
      policeResponse({
        results: [
          {
            provider: 'geoapify',
            externalId: 'wrong-country',
            name: 'Wrong Country Police',
            countryCode: 'NO',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 800,
          },
          {
            provider: 'other-provider',
            externalId: 'wrong-provider',
            name: 'Wrong Provider Police',
            countryCode: 'SE',
            latitude: 59.31,
            longitude: 18.11,
            distanceMeters: 900,
          },
          {
            provider: 'geoapify',
            externalId: 'safe-police',
            name: 'Safe Police Place',
            countryCode: 'SE',
            latitude: 59.32,
            longitude: 18.12,
            distanceMeters: 1200,
            website: 'javascript:alert(1)',
          },
        ],
      }),
    );

    render(<PoliceDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Safe Police Place', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country Police')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong Provider Police')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no matching police places are returned', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(policeResponse({ results: [] }));

    render(<PoliceDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No police stations were found in this search area.'),
    ).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret police provider detail'))
      .mockResolvedValueOnce(policeResponse());

    render(<PoliceDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Police stations could not be loaded right now.',
    );
    expect(screen.queryByText(/secret police provider detail/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Example Police Station', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the places provider', async () => {
    render(<PoliceDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
