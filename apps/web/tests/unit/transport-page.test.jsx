import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  autocompletePlaces: vi.fn(),
  getMapRoute: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    autocompletePlaces: mocks.autocompletePlaces,
    getMapRoute: mocks.getMapRoute,
  },
}));

const { TransportDestinationPage } =
  await import('../../src/features/destinations/transport-page.jsx');

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

function placeResponse() {
  return {
    places: {
      provider: 'geoapify',
      results: [
        {
          provider: 'geoapify',
          externalId: 'vasa-museum',
          name: 'Vasa Museum',
          formattedAddress: 'Galärvarvsvägen 14, Stockholm, Sweden',
          countryCode: 'SE',
          latitude: 59.328,
          longitude: 18.0914,
        },
      ],
    },
  };
}

function routeResponse(mode = 'walk') {
  return {
    route: {
      provider: 'geoapify',
      fetchedAt: '2026-09-05T08:00:00.000Z',
      mode,
      distanceMeters: 2400,
      durationSeconds: 1920,
    },
  };
}

async function searchAndSelectVasa() {
  fireEvent.change(screen.getByLabelText('Where do you want to go?'), {
    target: { value: 'Vasa Museum' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  const result = await screen.findByRole('button', { name: /Vasa Museum/ });
  fireEvent.click(result);
}

describe('TransportDestinationPage', () => {
  beforeEach(() => {
    mocks.autocompletePlaces.mockReset();
    mocks.getMapRoute.mockReset();
    mocks.autocompletePlaces.mockResolvedValue(placeResponse());
    mocks.getMapRoute.mockResolvedValue(routeResponse());
  });

  it('searches real destination-country places and renders a provider route summary', async () => {
    render(<TransportDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Getting around Stockholm', level: 1 }),
    ).toBeInTheDocument();

    await searchAndSelectVasa();

    expect(await screen.findByText('2.4 km')).toBeInTheDocument();
    expect(screen.getByText('32 min')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(
      screen.getByText(/do not represent live traffic, public-transport timetables/i),
    ).toBeInTheDocument();

    expect(mocks.autocompletePlaces).toHaveBeenCalledWith({
      query: 'Vasa Museum',
      limit: 6,
      language: 'en',
      countryCode: 'SE',
      biasLatitude: 59.3293,
      biasLongitude: 18.0686,
    });
    expect(mocks.getMapRoute).toHaveBeenCalledWith({
      startLatitude: 59.3293,
      startLongitude: 18.0686,
      endLatitude: 59.328,
      endLongitude: 18.0914,
      mode: 'walk',
      language: 'en',
    });
  });

  it('recalculates the selected route when the travel mode changes', async () => {
    mocks.getMapRoute
      .mockResolvedValueOnce(routeResponse('walk'))
      .mockResolvedValueOnce(routeResponse('bicycle'));

    render(<TransportDestinationPage destination={destination} locale="en" messages={messages} />);
    await searchAndSelectVasa();
    await screen.findByText('2.4 km');

    fireEvent.change(screen.getByLabelText('Travel mode'), { target: { value: 'bicycle' } });

    await waitFor(() => expect(mocks.getMapRoute).toHaveBeenCalledTimes(2));
    expect(mocks.getMapRoute).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'bicycle' }),
    );
  });

  it('rejects mismatched-country place rows instead of routing to altered provider data', async () => {
    mocks.autocompletePlaces.mockResolvedValue({
      places: {
        results: [
          {
            externalId: 'wrong-country',
            name: 'Vasa Museum',
            countryCode: 'US',
            latitude: 40.7,
            longitude: -74,
          },
        ],
      },
    });

    render(<TransportDestinationPage destination={destination} locale="en" messages={messages} />);

    fireEvent.change(screen.getByLabelText('Where do you want to go?'), {
      target: { value: 'Vasa Museum' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByText('No matching places were found in this destination country.'),
    ).toBeInTheDocument();
    expect(mocks.getMapRoute).not.toHaveBeenCalled();
  });

  it('keeps provider route failures private and exposes a working retry', async () => {
    mocks.getMapRoute
      .mockRejectedValueOnce(new Error('provider internals must not leak'))
      .mockResolvedValueOnce(routeResponse());

    render(<TransportDestinationPage destination={destination} locale="en" messages={messages} />);
    await searchAndSelectVasa();

    expect(await screen.findByText('The route could not be loaded right now.')).toBeInTheDocument();
    expect(screen.queryByText(/provider internals/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('2.4 km')).toBeInTheDocument();
    expect(mocks.getMapRoute).toHaveBeenCalledTimes(2);
  });

  it('renders an invalid destination state without calling provider APIs', () => {
    render(<TransportDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    expect(mocks.autocompletePlaces).not.toHaveBeenCalled();
    expect(mocks.getMapRoute).not.toHaveBeenCalled();
  });
});
