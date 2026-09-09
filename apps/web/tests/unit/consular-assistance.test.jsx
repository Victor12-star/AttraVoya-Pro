import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  autocompletePlaces: vi.fn(),
  getNearbyPlaces: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    autocompletePlaces: mocks.autocompletePlaces,
    getNearbyPlaces: mocks.getNearbyPlaces,
  },
}));

const { ConsularAssistance, normalizeDiplomaticPlaces } =
  await import('../../src/features/emergency/consular-assistance.jsx');

const countries = [
  { iso2: 'SE', name: 'Sweden' },
  { iso2: 'NG', name: 'Nigeria' },
];

function embassyResponse() {
  return {
    places: {
      provider: 'geoapify',
      results: [
        {
          provider: 'geoapify',
          externalId: 'embassy-1',
          name: 'Example Embassy',
          formattedAddress: '1 Example Street, Stockholm',
          latitude: 59.33,
          longitude: 18.06,
          distanceMeters: 1250,
          categories: ['office.government.embassy'],
          phone: '+46 000 000',
          website: 'https://unverified.example',
          openingHours: 'Mo-Fr 09:00-12:00',
        },
      ],
    },
  };
}

describe('ConsularAssistance', () => {
  beforeEach(() => {
    mocks.autocompletePlaces.mockReset();
    mocks.getNearbyPlaces.mockReset();
    mocks.autocompletePlaces.mockResolvedValue({
      places: {
        provider: 'geoapify',
        results: [
          {
            externalId: 'stockholm',
            name: 'Stockholm',
            formattedAddress: 'Stockholm, Sweden',
            latitude: 59.3293,
            longitude: 18.0686,
          },
        ],
      },
    });
    mocks.getNearbyPlaces.mockResolvedValue(embassyResponse());
  });

  it('uses manual place discovery and renders only trust-safe embassy fields', async () => {
    render(<ConsularAssistance locale="en" countries={countries} />);

    expect(
      screen.getByText(/Source: Geoapify place data. These results are not official/),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Or search a city or place' }), {
      target: { value: 'Stockholm' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search place' }));

    const placeButton = await screen.findByRole('button', {
      name: /Stockholm.*Choose this place/i,
    });
    fireEvent.click(placeButton);

    const embassy = await screen.findByRole('heading', { name: 'Example Embassy' });
    const card = embassy.closest('article');
    expect(card).not.toBeNull();
    expect(within(card).getByText('1 Example Street, Stockholm')).toBeInTheDocument();
    expect(within(card).getByText(/Distance: 1.3 km/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Open directions' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://www.google.com/maps/search/'),
    );
    expect(screen.queryByText('+46 000 000')).not.toBeInTheDocument();
    expect(screen.queryByText('Mo-Fr 09:00-12:00')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /unverified/i })).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'embassies',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 50_000,
      limit: 16,
      language: 'en',
    });
  });

  it('provides a manual fallback when browser geolocation is unavailable', () => {
    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });

    render(<ConsularAssistance locale="en" countries={countries} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use my current location' }));

    expect(
      screen.getByText(/Location was unavailable or not allowed.*search a city or place manually/),
    ).toBeInTheDocument();
    expect(mocks.getNearbyPlaces).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
  });

  it('keeps lost-passport guidance generic and links the user back to embassy help', async () => {
    render(<ConsularAssistance locale="en" countries={countries} />);

    expect(screen.getByRole('heading', { name: 'Lost or stolen passport' })).toBeInTheDocument();
    expect(
      screen.getByText('If it was stolen, consider contacting local police.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/A police report is not always mandatory/)).toBeInTheDocument();
    expect(screen.queryByText(/must file a police report/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Find embassy help' }));
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Embassy & consular help' }).closest('section'),
      ).toHaveFocus(),
    );
  });

  it('normalizes provider data without exposing optional contact or procedure fields', () => {
    const [place] = normalizeDiplomaticPlaces(embassyResponse());

    expect(place).toMatchObject({
      provider: 'geoapify',
      sourcePlaceId: 'embassy-1',
      name: 'Example Embassy',
      address: '1 Example Street, Stockholm',
      latitude: 59.33,
      longitude: 18.06,
      distanceMeters: 1250,
      trust: 'provider-place-data',
    });
    expect(place).not.toHaveProperty('phone');
    expect(place).not.toHaveProperty('website');
    expect(place).not.toHaveProperty('openingHours');
  });
});
