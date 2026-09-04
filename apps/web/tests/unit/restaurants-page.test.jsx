import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getNearbyPlaces: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getNearbyPlaces: mocks.getNearbyPlaces,
  },
}));

const { RestaurantsPage } = await import('../../src/features/destinations/restaurants-page.jsx');

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

function restaurantsResponse() {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-04T18:00:00.000Z',
      categoryGroup: 'restaurants',
      results: [
        {
          provider: 'geoapify',
          externalId: 'restaurant-one',
          name: 'Example Bistro',
          formattedAddress: 'Skeppsbron 1, Stockholm, Sweden',
          latitude: 59.325,
          longitude: 18.072,
          distanceMeters: 1250,
          website: 'https://example.com/',
        },
        {
          provider: 'geoapify',
          externalId: 'restaurant-two',
          name: 'Harbour Kitchen',
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.33,
          longitude: 18.07,
          distanceMeters: 420,
          website: 'javascript:alert(1)',
        },
      ],
    },
  };
}

describe('RestaurantsPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(restaurantsResponse());
  });

  it('loads normalized real restaurants through the provider-neutral places API', async () => {
    render(<RestaurantsPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Restaurants in Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Bistro', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Harbour Kitchen')).toBeInTheDocument();
    expect(screen.getByText('1.3 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'restaurants',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 5000,
      limit: 24,
      language: 'en',
    });
  });

  it('shows an honest empty state when the provider returns no restaurants', async () => {
    mocks.getNearbyPlaces.mockResolvedValue({
      places: { provider: 'geoapify', results: [] },
    });

    render(<RestaurantsPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No restaurants were found in this search area.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Example Bistro' })).not.toBeInTheDocument();
  });

  it('hides provider failure details and retries through the same API contract', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret provider details must never leak'))
      .mockResolvedValueOnce(restaurantsResponse());

    render(<RestaurantsPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Restaurants could not be loaded right now.',
    );
    expect(screen.queryByText(/secret provider details/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(
      await screen.findByRole('heading', { name: 'Example Bistro', level: 2 }),
    ).toBeInTheDocument();
    expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2);
  });

  it('renders invalid destination state without calling the places provider', async () => {
    render(<RestaurantsPage destination={null} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Temporarily unavailable', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
