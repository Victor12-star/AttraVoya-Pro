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

const { ShoppingPage } = await import('../../src/features/destinations/shopping-page.jsx');

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

function shoppingResponse() {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-04T19:00:00.000Z',
      categoryGroup: 'shopping',
      results: [
        {
          provider: 'geoapify',
          externalId: 'mall-one',
          name: 'Example Galleria',
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.333,
          longitude: 18.065,
          distanceMeters: 1650,
          website: 'https://example.com/',
        },
        {
          provider: 'geoapify',
          externalId: 'mall-two',
          name: 'Central Mall',
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.331,
          longitude: 18.061,
          distanceMeters: 480,
          website: 'javascript:alert(1)',
        },
      ],
    },
  };
}

describe('ShoppingPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(shoppingResponse());
  });

  it('loads normalized real shopping malls through the provider-neutral places API', async () => {
    render(<ShoppingPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Shopping near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Galleria', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Central Mall')).toBeInTheDocument();
    expect(screen.getByText('1.7 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'shopping',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 10000,
      limit: 24,
      language: 'en',
    });
  });

  it('shows an honest empty state when the provider returns no shopping malls', async () => {
    mocks.getNearbyPlaces.mockResolvedValue({
      places: { provider: 'geoapify', results: [] },
    });

    render(<ShoppingPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No shopping malls were found in this search area.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Example Galleria' })).not.toBeInTheDocument();
  });

  it('hides provider failure details and retries through the same API contract', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret provider details must never leak'))
      .mockResolvedValueOnce(shoppingResponse());

    render(<ShoppingPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Shopping places could not be loaded right now.',
    );
    expect(screen.queryByText(/secret provider details/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(
      await screen.findByRole('heading', { name: 'Example Galleria', level: 2 }),
    ).toBeInTheDocument();
    expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2);
  });

  it('renders invalid destination state without calling the places provider', async () => {
    render(<ShoppingPage destination={null} locale="en" messages={messages} />);

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
