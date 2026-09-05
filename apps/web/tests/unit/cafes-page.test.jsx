import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNearbyPlaces: mocks.getNearbyPlaces },
}));

const { CafesDestinationPage } = await import('../../src/features/destinations/cafes-page.jsx');

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

function cafesResponse(overrides = {}) {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T19:00:00.000Z',
      categoryGroup: 'cafes',
      results: [
        {
          provider: 'geoapify',
          externalId: 'cafe-1',
          name: 'Example Café',
          formattedAddress: 'Coffee Street, Stockholm County, Sweden',
          countryCode: 'SE',
          latitude: 59.333,
          longitude: 18.075,
          distanceMeters: 650,
          website: 'https://cafe.example/location',
          openingHours: 'Open 24/7',
          openNow: 'Open now',
          menu: 'Coffee and pastries',
          items: 'Cappuccino',
          price: 'SEK 50',
          reservation: 'Bookable',
          seating: '20 seats available',
          wifi: 'Free Wi-Fi',
          rating: '4.9 stars',
          reviews: '100 reviews',
          waitTime: '5 minutes',
          dietary: 'Vegan friendly',
          delivery: 'Delivery available',
          takeaway: 'Takeaway available',
          paymentMethods: 'Card accepted',
          accessibility: 'Wheelchair accessible',
          availability: 'Tables available',
        },
      ],
      ...overrides,
    },
  };
}

describe('CafesDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(cafesResponse());
  });

  it('loads nearby cafes through the provider-neutral places API and renders only supported location facts', async () => {
    render(<CafesDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Cafés near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Café', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Coffee Street, Stockholm County, Sweden')).toBeInTheDocument();
    expect(screen.getByText('650 m')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://cafe.example/location',
    );

    expect(screen.queryByText('Open 24/7')).not.toBeInTheDocument();
    expect(screen.queryByText('Open now')).not.toBeInTheDocument();
    expect(screen.queryByText('Coffee and pastries')).not.toBeInTheDocument();
    expect(screen.queryByText('Cappuccino')).not.toBeInTheDocument();
    expect(screen.queryByText('SEK 50')).not.toBeInTheDocument();
    expect(screen.queryByText('Bookable')).not.toBeInTheDocument();
    expect(screen.queryByText('20 seats available')).not.toBeInTheDocument();
    expect(screen.queryByText('Free Wi-Fi')).not.toBeInTheDocument();
    expect(screen.queryByText('4.9 stars')).not.toBeInTheDocument();
    expect(screen.queryByText('100 reviews')).not.toBeInTheDocument();
    expect(screen.queryByText('5 minutes')).not.toBeInTheDocument();
    expect(screen.queryByText('Vegan friendly')).not.toBeInTheDocument();
    expect(screen.queryByText('Delivery available')).not.toBeInTheDocument();
    expect(screen.queryByText('Takeaway available')).not.toBeInTheDocument();
    expect(screen.queryByText('Card accepted')).not.toBeInTheDocument();
    expect(screen.queryByText('Wheelchair accessible')).not.toBeInTheDocument();
    expect(screen.queryByText('Tables available')).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'cafes',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 10000,
      limit: 24,
      language: 'en',
    });
  });

  it('rejects mismatched-country and provider rows and hides unsafe websites', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(
      cafesResponse({
        results: [
          {
            provider: 'geoapify',
            externalId: 'wrong-country',
            name: 'Wrong Country Café',
            countryCode: 'NO',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 700,
          },
          {
            provider: 'other-provider',
            externalId: 'wrong-provider',
            name: 'Wrong Provider Café',
            countryCode: 'SE',
            latitude: 59.31,
            longitude: 18.11,
            distanceMeters: 800,
          },
          {
            provider: 'geoapify',
            externalId: 'safe-cafe',
            name: 'Safe Café',
            countryCode: 'SE',
            latitude: 59.32,
            longitude: 18.12,
            distanceMeters: 900,
            website: 'javascript:alert(1)',
          },
        ],
      }),
    );

    render(<CafesDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Safe Café', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country Café')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong Provider Café')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no matching cafes are returned', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(cafesResponse({ results: [] }));

    render(<CafesDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByText('No cafés were found in this search area.')).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret cafe provider detail'))
      .mockResolvedValueOnce(cafesResponse());

    render(<CafesDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cafés could not be loaded right now.',
    );
    expect(screen.queryByText(/secret cafe provider detail/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Example Café', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the places provider', async () => {
    render(<CafesDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
