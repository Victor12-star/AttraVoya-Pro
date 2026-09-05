import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNearbyPlaces: mocks.getNearbyPlaces },
}));

const { PharmaciesDestinationPage } =
  await import('../../src/features/destinations/pharmacies-page.jsx');

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

function pharmaciesResponse(overrides = {}) {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T13:00:00.000Z',
      categoryGroup: 'pharmacies',
      results: [
        {
          provider: 'geoapify',
          externalId: 'pharmacy-1',
          name: 'Example Pharmacy',
          formattedAddress: 'Pharmacy Road, Stockholm County, Sweden',
          countryCode: 'SE',
          latitude: 59.338,
          longitude: 18.074,
          distanceMeters: 1100,
          website: 'https://pharmacy.example/',
          medicationStock: 'Medicine X is in stock',
          prescriptionAvailability: 'Prescription medicine is available',
          pharmacistAvailability: 'A pharmacist is available now',
          openingStatus: 'Open now until midnight',
          medicationPrice: 'SEK 99 today',
          urgentCareSuitability: 'Walk in now for urgent care',
          medicalAdvice: 'Take two tablets immediately',
        },
      ],
      ...overrides,
    },
  };
}

describe('PharmaciesDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(pharmaciesResponse());
  });

  it('loads nearby pharmacies through the provider-neutral places API and renders only supported location facts', async () => {
    render(<PharmaciesDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Pharmacies near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Pharmacy', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pharmacy Road, Stockholm County, Sweden')).toBeInTheDocument();
    expect(screen.getByText('1.1 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://pharmacy.example/',
    );
    expect(screen.getByRole('link', { name: 'Verified emergency contacts' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/safety?'),
    );

    expect(screen.queryByText('Medicine X is in stock')).not.toBeInTheDocument();
    expect(screen.queryByText('Prescription medicine is available')).not.toBeInTheDocument();
    expect(screen.queryByText('A pharmacist is available now')).not.toBeInTheDocument();
    expect(screen.queryByText('Open now until midnight')).not.toBeInTheDocument();
    expect(screen.queryByText('SEK 99 today')).not.toBeInTheDocument();
    expect(screen.queryByText('Walk in now for urgent care')).not.toBeInTheDocument();
    expect(screen.queryByText('Take two tablets immediately')).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'pharmacies',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 10000,
      limit: 20,
      language: 'en',
    });
  });

  it('rejects mismatched-country and provider rows and hides unsafe websites', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(
      pharmaciesResponse({
        results: [
          {
            provider: 'geoapify',
            externalId: 'wrong-country',
            name: 'Wrong Country Pharmacy',
            countryCode: 'NO',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 800,
          },
          {
            provider: 'other-provider',
            externalId: 'wrong-provider',
            name: 'Wrong Provider Pharmacy',
            countryCode: 'SE',
            latitude: 59.31,
            longitude: 18.11,
            distanceMeters: 900,
          },
          {
            provider: 'geoapify',
            externalId: 'safe-pharmacy',
            name: 'Safe Pharmacy',
            countryCode: 'SE',
            latitude: 59.32,
            longitude: 18.12,
            distanceMeters: 1200,
            website: 'javascript:alert(1)',
          },
        ],
      }),
    );

    render(<PharmaciesDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Safe Pharmacy', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country Pharmacy')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong Provider Pharmacy')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no matching pharmacies are returned', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(pharmaciesResponse({ results: [] }));

    render(<PharmaciesDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No pharmacies were found in this search area.'),
    ).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('secret pharmacy provider detail'))
      .mockResolvedValueOnce(pharmaciesResponse());

    render(<PharmaciesDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pharmacies could not be loaded right now.',
    );
    expect(screen.queryByText(/secret pharmacy provider detail/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Example Pharmacy', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the places provider', async () => {
    render(<PharmaciesDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
