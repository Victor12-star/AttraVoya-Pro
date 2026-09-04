import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLACE_CATEGORY_GROUPS } from '@attravoya/constants';

const mocks = vi.hoisted(() => ({
  getNearbyPlaces: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getNearbyPlaces: mocks.getNearbyPlaces,
  },
}));

const { NearbyDestinationPage } = await import('../../src/features/destinations/nearby-page.jsx');

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

function placesResponse(name = 'Nearby Café') {
  return {
    places: {
      provider: 'geoapify',
      results: [
        {
          provider: 'geoapify',
          externalId: `place-${name}`,
          name,
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.33,
          longitude: 18.07,
          distanceMeters: 720,
          website: 'https://example.com/',
        },
      ],
    },
  };
}

describe('NearbyDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(placesResponse());
  });

  it('loads real nearby cafés through the provider-neutral places API', async () => {
    render(<NearbyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Useful places near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Nearby Café', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('720 m')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: PLACE_CATEGORY_GROUPS.CAFES,
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 3000,
      limit: 16,
      language: 'en',
    });
  });

  it('refetches when the user selects a different nearby category', async () => {
    mocks.getNearbyPlaces
      .mockResolvedValueOnce(placesResponse())
      .mockResolvedValueOnce(placesResponse('Central Pharmacy'));

    render(<NearbyDestinationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Nearby Café', level: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Pharmacies' }));

    expect(
      await screen.findByRole('heading', { name: 'Central Pharmacy', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pharmacies' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(mocks.getNearbyPlaces).toHaveBeenLastCalledWith({
      categoryGroup: PLACE_CATEGORY_GROUPS.PHARMACIES,
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 3000,
      limit: 16,
      language: 'en',
    });
  });

  it('hides provider failure details and retries the selected nearby category', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('private provider failure detail'))
      .mockResolvedValueOnce(placesResponse());

    render(<NearbyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nearby places could not be loaded right now.',
    );
    expect(screen.queryByText(/private provider failure detail/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('heading', { name: 'Nearby Café', level: 2 }),
    ).toBeInTheDocument();
    expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2);
  });

  it('renders invalid destination state without calling the provider', async () => {
    render(<NearbyDestinationPage destination={null} locale="en" messages={messages} />);

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
