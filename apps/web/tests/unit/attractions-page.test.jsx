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

const { AttractionsPage } = await import('../../src/features/destinations/attractions-page.jsx');

const messages = {
  navigation: { thingsToDo: 'Things to do' },
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

function attractionsResponse() {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-04T18:00:00.000Z',
      categoryGroup: 'attractions',
      results: [
        {
          provider: 'geoapify',
          externalId: 'vasa-museum',
          name: 'Vasa Museum',
          formattedAddress: 'Galärvarvsvägen 14, Stockholm, Sweden',
          latitude: 59.328,
          longitude: 18.091,
          distanceMeters: 1400,
          website: 'https://www.vasamuseet.se/',
        },
        {
          provider: 'geoapify',
          externalId: 'safe-place',
          name: 'Waterfront viewpoint',
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.33,
          longitude: 18.07,
          distanceMeters: 400,
          website: 'javascript:alert(1)',
        },
      ],
    },
  };
}

describe('AttractionsPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(attractionsResponse());
  });

  it('loads normalized real attractions through the provider-neutral places API', async () => {
    render(<AttractionsPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Attractions in Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Vasa Museum', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Waterfront viewpoint')).toBeInTheDocument();
    expect(screen.getByText('1.4 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://www.vasamuseet.se/',
    );
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'attractions',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 10000,
      limit: 24,
      language: 'en',
    });
  });

  it('shows an honest empty state when the provider returns no attractions', async () => {
    mocks.getNearbyPlaces.mockResolvedValue({
      places: { provider: 'geoapify', results: [] },
    });

    render(<AttractionsPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No attractions were found in this search area.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Vasa Museum' })).not.toBeInTheDocument();
  });

  it('contains provider failure details and retries through the same API contract', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret provider details must never leak'))
      .mockResolvedValueOnce(attractionsResponse());

    render(<AttractionsPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Attractions could not be loaded right now.',
    );
    expect(screen.queryByText(/secret provider details/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(await screen.findByRole('heading', { name: 'Vasa Museum', level: 2 })).toBeInTheDocument();
    expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2);
  });

  it('renders invalid destination state without calling the places provider', async () => {
    render(<AttractionsPage destination={null} locale="en" messages={messages} />);

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
