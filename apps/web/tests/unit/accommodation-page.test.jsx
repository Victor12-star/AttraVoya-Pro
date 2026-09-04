import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getNearbyAccommodation: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getNearbyAccommodation: mocks.getNearbyAccommodation,
  },
}));

const { AccommodationPage } =
  await import('../../src/features/destinations/accommodation-page.jsx');

const messages = {
  common: {
    loading: 'Loading…',
    unavailable: 'Temporarily unavailable',
    retry: 'Retry',
  },
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

function accommodationResponse() {
  return {
    accommodation: {
      provider: 'geoapify',
      fetchedAt: '2026-09-04T19:45:00.000Z',
      inventoryDataAvailable: false,
      results: [
        {
          provider: 'geoapify',
          externalId: 'hotel-one',
          name: 'Example Hotel',
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.34,
          longitude: 18.07,
          distanceMeters: 1800,
          website: 'https://example.com/',
          accommodationType: 'HOTEL',
          livePrice: null,
          liveAvailability: null,
        },
        {
          provider: 'geoapify',
          externalId: 'hostel-two',
          name: 'Central Hostel',
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.33,
          longitude: 18.06,
          distanceMeters: 620,
          website: 'javascript:alert(1)',
          accommodationType: 'HOSTEL',
          livePrice: null,
          liveAvailability: null,
        },
      ],
    },
  };
}

describe('AccommodationPage', () => {
  beforeEach(() => {
    mocks.getNearbyAccommodation.mockReset();
    mocks.getNearbyAccommodation.mockResolvedValue(accommodationResponse());
  });

  it('renders real lodging locations without inventing live inventory data', async () => {
    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Places to stay near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Hotel', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Central Hostel', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('620 m')).toBeInTheDocument();
    expect(screen.getByText('1.8 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Location data only. Live room prices and availability are not connected yet.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();

    expect(mocks.getNearbyAccommodation).toHaveBeenCalledWith({
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 10000,
      limit: 24,
      language: 'en',
      types: [],
    });
  });

  it('refetches through the dedicated accommodation API when a supported type is selected', async () => {
    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Example Hotel', level: 2 });
    screen.getByRole('button', { name: 'Hotels' }).click();

    await waitFor(() =>
      expect(mocks.getNearbyAccommodation).toHaveBeenLastCalledWith({
        latitude: 59.3293,
        longitude: 18.0686,
        radiusMeters: 10000,
        limit: 24,
        language: 'en',
        types: ['HOTEL'],
      }),
    );
    expect(screen.getByRole('button', { name: 'Hotels' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an honest empty state when the provider returns no lodging locations', async () => {
    mocks.getNearbyAccommodation.mockResolvedValue({
      accommodation: {
        provider: 'geoapify',
        inventoryDataAvailable: false,
        results: [],
      },
    });

    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No lodging locations were found in this search area.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Example Hotel' })).not.toBeInTheDocument();
  });

  it('hides provider failure details and retries through the same accommodation contract', async () => {
    mocks.getNearbyAccommodation
      .mockRejectedValueOnce(new Error('secret provider details must never leak'))
      .mockResolvedValueOnce(accommodationResponse());

    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Accommodation locations could not be loaded right now.',
    );
    expect(screen.queryByText(/secret provider details/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(
      await screen.findByRole('heading', { name: 'Example Hotel', level: 2 }),
    ).toBeInTheDocument();
    expect(mocks.getNearbyAccommodation).toHaveBeenCalledTimes(2);
  });

  it('renders invalid destination state without calling the accommodation provider', async () => {
    render(<AccommodationPage destination={null} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Temporarily unavailable', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyAccommodation).not.toHaveBeenCalled());
  });
});
