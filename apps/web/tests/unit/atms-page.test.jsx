import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNearbyPlaces: mocks.getNearbyPlaces },
}));

const { AtmsDestinationPage } = await import('../../src/features/destinations/atms-page.jsx');

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

function atmResponse(overrides = {}) {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T14:00:00.000Z',
      categoryGroup: 'atms',
      results: [
        {
          provider: 'geoapify',
          externalId: 'atm-1',
          name: 'Example ATM',
          formattedAddress: 'Cash Street, Stockholm County, Sweden',
          countryCode: 'SE',
          latitude: 59.333,
          longitude: 18.075,
          distanceMeters: 800,
          website: 'https://bank.example/atm',
          operationalStatus: 'Working now',
          cashAvailable: 'Cash available',
          supportedCards: 'Visa supported',
          network: 'Plus network',
          currency: 'EUR available',
          denominations: '20 EUR notes',
          depositSupport: 'Deposits accepted',
          fee: 'SEK 40 fee',
          withdrawalLimit: 'SEK 5000 limit',
          accessHours: '24/7 access',
          accessibility: 'Wheelchair accessible',
        },
      ],
      ...overrides,
    },
  };
}

describe('AtmsDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(atmResponse());
  });

  it('loads nearby ATMs through the provider-neutral places API and renders only supported location facts', async () => {
    render(<AtmsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'ATMs near Stockholm', level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Example ATM', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Cash Street, Stockholm County, Sweden')).toBeInTheDocument();
    expect(screen.getByText('800 m')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://bank.example/atm',
    );

    expect(screen.queryByText('Working now')).not.toBeInTheDocument();
    expect(screen.queryByText('Cash available')).not.toBeInTheDocument();
    expect(screen.queryByText('Visa supported')).not.toBeInTheDocument();
    expect(screen.queryByText('Plus network')).not.toBeInTheDocument();
    expect(screen.queryByText('EUR available')).not.toBeInTheDocument();
    expect(screen.queryByText('20 EUR notes')).not.toBeInTheDocument();
    expect(screen.queryByText('Deposits accepted')).not.toBeInTheDocument();
    expect(screen.queryByText('SEK 40 fee')).not.toBeInTheDocument();
    expect(screen.queryByText('SEK 5000 limit')).not.toBeInTheDocument();
    expect(screen.queryByText('24/7 access')).not.toBeInTheDocument();
    expect(screen.queryByText('Wheelchair accessible')).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'atms',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 10000,
      limit: 24,
      language: 'en',
    });
  });

  it('rejects mismatched-country and provider rows and hides unsafe websites', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(
      atmResponse({
        results: [
          {
            provider: 'geoapify',
            externalId: 'wrong-country',
            name: 'Wrong Country ATM',
            countryCode: 'NO',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 700,
          },
          {
            provider: 'other-provider',
            externalId: 'wrong-provider',
            name: 'Wrong Provider ATM',
            countryCode: 'SE',
            latitude: 59.31,
            longitude: 18.11,
            distanceMeters: 800,
          },
          {
            provider: 'geoapify',
            externalId: 'safe-atm',
            name: 'Safe ATM',
            countryCode: 'SE',
            latitude: 59.32,
            longitude: 18.12,
            distanceMeters: 900,
            website: 'javascript:alert(1)',
          },
        ],
      }),
    );

    render(<AtmsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('heading', { name: 'Safe ATM', level: 3 })).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country ATM')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong Provider ATM')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no matching ATMs are returned', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(atmResponse({ results: [] }));

    render(<AtmsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByText('No ATMs were found in this search area.')).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret ATM provider detail'))
      .mockResolvedValueOnce(atmResponse());

    render(<AtmsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('ATMs could not be loaded right now.');
    expect(screen.queryByText(/secret ATM provider detail/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('heading', { name: 'Example ATM', level: 3 })).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the places provider', async () => {
    render(<AtmsDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
