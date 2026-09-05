import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNearbyPlaces: mocks.getNearbyPlaces },
}));

const { SupermarketsDestinationPage } =
  await import('../../src/features/destinations/supermarkets-page.jsx');

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

function supermarketResponse(overrides = {}) {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T14:00:00.000Z',
      categoryGroup: 'supermarkets',
      results: [
        {
          provider: 'geoapify',
          externalId: 'supermarket-1',
          name: 'Example Supermarket',
          formattedAddress: 'Market Road, Stockholm County, Sweden',
          countryCode: 'SE',
          latitude: 59.333,
          longitude: 18.075,
          distanceMeters: 1200,
          website: 'https://market.example/',
          openingStatus: 'Open now',
          stock: 'In stock',
          productAvailability: 'Available',
          price: 'SEK 10',
          promotion: '20% off',
          delivery: 'Available',
          collection: 'Ready now',
          queue: 'No queue',
          paymentMethods: 'All cards',
        },
      ],
      ...overrides,
    },
  };
}

describe('SupermarketsDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(supermarketResponse());
  });

  it('loads nearby supermarkets through the provider-neutral places API and renders only supported location facts', async () => {
    render(
      <SupermarketsDestinationPage destination={destination} locale="en" messages={messages} />,
    );

    expect(
      screen.getByRole('heading', { name: 'Supermarkets near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Supermarket', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Market Road, Stockholm County, Sweden')).toBeInTheDocument();
    expect(screen.getByText('1.2 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://market.example/',
    );

    expect(screen.queryByText('Open now')).not.toBeInTheDocument();
    expect(screen.queryByText('In stock')).not.toBeInTheDocument();
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
    expect(screen.queryByText('SEK 10')).not.toBeInTheDocument();
    expect(screen.queryByText('20% off')).not.toBeInTheDocument();
    expect(screen.queryByText('Ready now')).not.toBeInTheDocument();
    expect(screen.queryByText('No queue')).not.toBeInTheDocument();
    expect(screen.queryByText('All cards')).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'supermarkets',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 10000,
      limit: 24,
      language: 'en',
    });
  });

  it('rejects mismatched-country and provider rows and hides unsafe websites', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(
      supermarketResponse({
        results: [
          {
            provider: 'geoapify',
            externalId: 'wrong-country',
            name: 'Wrong Country Market',
            countryCode: 'NO',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 700,
          },
          {
            provider: 'other-provider',
            externalId: 'wrong-provider',
            name: 'Wrong Provider Market',
            countryCode: 'SE',
            latitude: 59.31,
            longitude: 18.11,
            distanceMeters: 800,
          },
          {
            provider: 'geoapify',
            externalId: 'safe-market',
            name: 'Safe Supermarket',
            countryCode: 'SE',
            latitude: 59.32,
            longitude: 18.12,
            distanceMeters: 900,
            website: 'javascript:alert(1)',
          },
        ],
      }),
    );

    render(
      <SupermarketsDestinationPage destination={destination} locale="en" messages={messages} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Safe Supermarket', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country Market')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong Provider Market')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no matching supermarkets are returned', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(supermarketResponse({ results: [] }));

    render(
      <SupermarketsDestinationPage destination={destination} locale="en" messages={messages} />,
    );

    expect(
      await screen.findByText('No supermarkets were found in this search area.'),
    ).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret supermarket provider detail'))
      .mockResolvedValueOnce(supermarketResponse());

    render(
      <SupermarketsDestinationPage destination={destination} locale="en" messages={messages} />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Supermarkets could not be loaded right now.',
    );
    expect(screen.queryByText(/secret supermarket provider detail/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Example Supermarket', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the places provider', async () => {
    render(<SupermarketsDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
