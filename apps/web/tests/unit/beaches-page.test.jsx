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

const { BeachesPage } = await import('../../src/features/destinations/beaches-page.jsx');

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
  externalId: 'place-barcelona',
  name: 'Barcelona',
  state: 'Catalonia',
  countryCode: 'ES',
  countryDisplayName: 'Spain',
  latitude: 41.3874,
  longitude: 2.1686,
  timeZone: 'Europe/Madrid',
  slug: 'barcelona-es',
};

function beachesResponse() {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-04T18:00:00.000Z',
      categoryGroup: 'beaches',
      results: [
        {
          provider: 'geoapify',
          externalId: 'beach-one',
          name: 'Example Beach',
          formattedAddress: 'Barcelona, Spain',
          latitude: 41.378,
          longitude: 2.192,
          distanceMeters: 1800,
          website: 'https://example.com/',
        },
        {
          provider: 'geoapify',
          externalId: 'beach-two',
          name: 'Harbour Beach',
          formattedAddress: 'Barcelona, Spain',
          latitude: 41.371,
          longitude: 2.187,
          distanceMeters: 620,
          website: 'javascript:alert(1)',
        },
      ],
    },
  };
}

describe('BeachesPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(beachesResponse());
  });

  it('loads normalized real beaches through the provider-neutral places API', async () => {
    render(<BeachesPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Beaches near Barcelona', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Beach', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Harbour Beach')).toBeInTheDocument();
    expect(screen.getByText('1.8 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'beaches',
      latitude: 41.3874,
      longitude: 2.1686,
      radiusMeters: 20000,
      limit: 24,
      language: 'en',
    });
  });

  it('shows an honest empty state when the provider returns no beaches', async () => {
    mocks.getNearbyPlaces.mockResolvedValue({
      places: { provider: 'geoapify', results: [] },
    });

    render(<BeachesPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByText('No beaches were found in this search area.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Example Beach' })).not.toBeInTheDocument();
  });

  it('hides provider failure details and retries through the same API contract', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret provider details must never leak'))
      .mockResolvedValueOnce(beachesResponse());

    render(<BeachesPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Beaches could not be loaded right now.');
    expect(screen.queryByText(/secret provider details/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(
      await screen.findByRole('heading', { name: 'Example Beach', level: 2 }),
    ).toBeInTheDocument();
    expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2);
  });

  it('renders invalid destination state without calling the places provider', async () => {
    render(<BeachesPage destination={null} locale="en" messages={messages} />);

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
