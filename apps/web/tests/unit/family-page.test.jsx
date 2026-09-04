import { render, screen, waitFor } from '@testing-library/react';
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

const { FamilyDestinationPage } = await import('../../src/features/destinations/family-page.jsx');

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

function placeResponse(categoryGroup) {
  const names = {
    [PLACE_CATEGORY_GROUPS.PLAYGROUNDS]: 'Playground One',
    [PLACE_CATEGORY_GROUPS.PARKS]: 'Park One',
    [PLACE_CATEGORY_GROUPS.ATTRACTIONS]: 'Attraction One',
  };

  return {
    places: {
      provider: 'geoapify',
      results: [
        {
          provider: 'geoapify',
          externalId: `${categoryGroup}-one`,
          name: names[categoryGroup],
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.33,
          longitude: 18.07,
          distanceMeters: 850,
          website: 'https://example.com/',
        },
      ],
    },
  };
}

describe('FamilyDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockImplementation(({ categoryGroup }) =>
      Promise.resolve(placeResponse(categoryGroup)),
    );
  });

  it('loads factual playground, park and attraction results without age-suitability claims', async () => {
    render(<FamilyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Family places near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Age selections organise your planning only. Provider results are not verified for age suitability or safety.',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Playground One', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Park One', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Attraction One', level: 3 })).toBeInTheDocument();
    expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(3);

    for (const categoryGroup of [
      PLACE_CATEGORY_GROUPS.PLAYGROUNDS,
      PLACE_CATEGORY_GROUPS.PARKS,
      PLACE_CATEGORY_GROUPS.ATTRACTIONS,
    ]) {
      expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
        categoryGroup,
        latitude: 59.3293,
        longitude: 18.0686,
        radiusMeters: 10000,
        limit: 12,
        language: 'en',
      });
    }
  });

  it('uses the required child age bands as interactive planning context', async () => {
    render(<FamilyDestinationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Playground One', level: 3 });
    const youngestBand = screen.getByRole('button', { name: '0–3' });
    const oldestBand = screen.getByRole('button', { name: '13–17' });

    expect(youngestBand).toHaveAttribute('aria-pressed', 'false');
    youngestBand.click();
    oldestBand.click();
    expect(youngestBand).toHaveAttribute('aria-pressed', 'true');
    expect(oldestBand).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps successful categories visible when one provider category fails', async () => {
    mocks.getNearbyPlaces.mockImplementation(({ categoryGroup }) => {
      if (categoryGroup === PLACE_CATEGORY_GROUPS.PARKS) {
        return Promise.reject(new Error('provider detail must not leak'));
      }
      return Promise.resolve(placeResponse(categoryGroup));
    });

    render(<FamilyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Playground One', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Attraction One', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('This place category is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByText(/provider detail/i)).not.toBeInTheDocument();
  });

  it('renders invalid destination state without calling the places provider', async () => {
    render(<FamilyDestinationPage destination={null} locale="en" messages={messages} />);

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
