import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNearbyPlaces: mocks.getNearbyPlaces },
}));

const { HospitalsDestinationPage } =
  await import('../../src/features/destinations/hospitals-page.jsx');

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

function hospitalsResponse(overrides = {}) {
  return {
    places: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T13:00:00.000Z',
      categoryGroup: 'hospitals',
      results: [
        {
          provider: 'geoapify',
          externalId: 'hospital-1',
          name: 'Example Hospital',
          formattedAddress: 'Hospital Road, Stockholm County, Sweden',
          countryCode: 'SE',
          latitude: 59.34,
          longitude: 18.07,
          distanceMeters: 1800,
          website: 'https://hospital.example/',
          emergencyDepartment: 'Open 24 hours',
          waitingTime: '5 minutes',
          rating: '5 stars',
          capacity: 'Available beds',
        },
      ],
      ...overrides,
    },
  };
}

describe('HospitalsDestinationPage', () => {
  beforeEach(() => {
    mocks.getNearbyPlaces.mockReset();
    mocks.getNearbyPlaces.mockResolvedValue(hospitalsResponse());
  });

  it('loads nearby hospitals through the provider-neutral places API and renders only supported facts', async () => {
    render(<HospitalsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Hospitals near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Hospital', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Hospital Road, Stockholm County, Sweden')).toBeInTheDocument();
    expect(screen.getByText('1.8 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://hospital.example/',
    );
    expect(screen.getByRole('link', { name: 'Verified emergency contacts' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/safety?'),
    );
    expect(screen.queryByText('Open 24 hours')).not.toBeInTheDocument();
    expect(screen.queryByText('5 minutes')).not.toBeInTheDocument();
    expect(screen.queryByText('5 stars')).not.toBeInTheDocument();
    expect(screen.queryByText('Available beds')).not.toBeInTheDocument();

    expect(mocks.getNearbyPlaces).toHaveBeenCalledWith({
      categoryGroup: 'hospitals',
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 20000,
      limit: 20,
      language: 'en',
    });
  });

  it('rejects mismatched-country and provider rows and hides unsafe websites', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(
      hospitalsResponse({
        results: [
          {
            provider: 'geoapify',
            externalId: 'wrong-country',
            name: 'Wrong Country Hospital',
            countryCode: 'US',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 1000,
          },
          {
            provider: 'other-provider',
            externalId: 'wrong-provider',
            name: 'Wrong Provider Hospital',
            countryCode: 'SE',
            latitude: 59.3,
            longitude: 18.1,
            distanceMeters: 1500,
          },
          {
            provider: 'geoapify',
            externalId: 'safe-hospital',
            name: 'Safe Hospital',
            countryCode: 'SE',
            latitude: 59.35,
            longitude: 18.15,
            distanceMeters: 2000,
            website: 'javascript:alert(1)',
          },
        ],
      }),
    );

    render(<HospitalsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Safe Hospital', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong Country Hospital')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong Provider Hospital')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no matching hospitals are returned', async () => {
    mocks.getNearbyPlaces.mockResolvedValue(hospitalsResponse({ results: [] }));

    render(<HospitalsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No hospitals were found in this search area.'),
    ).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNearbyPlaces
      .mockRejectedValueOnce(new Error('provider secret details must not leak'))
      .mockResolvedValueOnce(hospitalsResponse());

    render(<HospitalsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Hospitals could not be loaded right now.',
    );
    expect(screen.queryByText(/provider secret details/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNearbyPlaces).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Example Hospital', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the places provider', async () => {
    render(<HospitalsDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyPlaces).not.toHaveBeenCalled());
  });
});
