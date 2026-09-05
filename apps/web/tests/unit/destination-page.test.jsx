import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getWeather: vi.fn(),
  searchImages: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getWeather: mocks.getWeather,
    searchImages: mocks.searchImages,
  },
}));

vi.mock('next/image', () => ({
  default: ({ alt, src }) => <span role="img" aria-label={alt} data-src={src} />,
}));

const { DestinationPage } = await import('../../src/features/destinations/destination-page.jsx');

const messages = {
  navigation: {
    explore: 'Explore',
    stays: 'Stays',
    thingsToDo: 'Things to do',
    nearby: 'Nearby',
  },
  common: {
    loading: 'Loading…',
    unavailable: 'Temporarily unavailable',
    retry: 'Retry',
    chooseCurrency: 'Choose currency',
    chooseLanguage: 'Choose language',
  },
  home: { exploreCta: 'Explore destinations' },
  search: { destinationQuestion: 'Where do you want to go?' },
  safety: { title: 'Safety & emergency' },
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

function weatherResponse() {
  return {
    weather: {
      provider: 'openmeteo',
      current: {
        temperatureC: 14,
        feelsLikeC: 12.5,
        windSpeedKmh: 18,
        precipitationMm: 0,
      },
    },
  };
}

function imageResponse() {
  return {
    images: {
      attribution: { providerUrl: 'https://www.pexels.com' },
      photos: [
        {
          alt: 'Stockholm waterfront',
          sources: { large: 'https://images.pexels.com/photos/123/example.jpeg' },
          photographer: {
            name: 'Example Photographer',
            profileUrl: 'https://www.pexels.com/@example',
          },
        },
      ],
    },
  };
}

describe('DestinationPage', () => {
  beforeEach(() => {
    mocks.getWeather.mockReset();
    mocks.searchImages.mockReset();
    mocks.getWeather.mockResolvedValue(weatherResponse());
    mocks.searchImages.mockResolvedValue(imageResponse());
  });

  it('renders provider destination data, real weather and configured Pexels imagery', async () => {
    render(<DestinationPage destination={destination} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Stockholm', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(await screen.findByText('14 °C')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Stockholm waterfront' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pexels' })).toHaveAttribute(
      'href',
      'https://www.pexels.com',
    );
    expect(screen.getByRole('link', { name: 'Stays' })).toHaveAttribute(
      'href',
      expect.stringContaining('/accommodation?'),
    );
    expect(screen.getByRole('link', { name: 'Stays' })).toHaveAttribute(
      'href',
      expect.stringContaining('destination=Stockholm'),
    );
    expect(screen.getByRole('link', { name: 'Airports' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/airports?'),
    );
    expect(screen.getByRole('link', { name: 'Hospitals' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/hospitals?'),
    );
    expect(screen.getByRole('link', { name: 'Pharmacies' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/pharmacies?'),
    );
    expect(screen.getByRole('link', { name: 'Police stations' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/police?'),
    );
    expect(screen.getByRole('link', { name: 'Museums' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/museums?'),
    );
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/events?'),
    );
    expect(screen.getByRole('link', { name: 'News' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/news?'),
    );
    expect(screen.getByRole('link', { name: 'Restaurants' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/restaurants?'),
    );
    expect(screen.getByRole('link', { name: 'Beaches' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/beaches?'),
    );
    expect(screen.getByRole('link', { name: 'Shopping' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/shopping?'),
    );
    expect(screen.getByRole('link', { name: 'Supermarkets' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/supermarkets?'),
    );
    expect(screen.getByRole('link', { name: 'Transport' })).toHaveAttribute(
      'href',
      expect.stringContaining('/destinations/stockholm-se/transport?'),
    );

    expect(mocks.getWeather).toHaveBeenCalledWith({
      latitude: 59.3293,
      longitude: 18.0686,
      forecastDays: 4,
      timezone: 'Europe/Stockholm',
    });
    expect(mocks.searchImages).toHaveBeenCalledWith({
      query: 'Stockholm Sweden',
      orientation: 'landscape',
      perPage: 1,
    });
  });

  it('keeps missing imagery honest and exposes a working retry control', async () => {
    mocks.searchImages
      .mockRejectedValueOnce(new Error('provider unavailable'))
      .mockResolvedValueOnce(imageResponse());

    render(<DestinationPage destination={destination} locale="en" messages={messages} />);

    await waitFor(() => expect(mocks.searchImages).toHaveBeenCalledTimes(1));
    const retryButtons = await screen.findAllByRole('button', { name: 'Retry' });
    retryButtons[0].click();

    expect(await screen.findByRole('img', { name: 'Stockholm waterfront' })).toBeInTheDocument();
    expect(mocks.searchImages).toHaveBeenCalledTimes(2);
  });

  it('shows weather failure safely and retries through the same backend contract', async () => {
    mocks.getWeather
      .mockRejectedValueOnce(new Error('details should not leak'))
      .mockResolvedValueOnce(weatherResponse());

    render(<DestinationPage destination={destination} locale="en" messages={messages} />);

    const weatherRegion = screen.getByRole('region', { name: 'Current weather' });
    expect(await within(weatherRegion).findByText('Temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/details should not leak/i)).not.toBeInTheDocument();

    within(weatherRegion).getByRole('button', { name: 'Retry' }).click();
    expect(await within(weatherRegion).findByText('14 °C')).toBeInTheDocument();
    expect(mocks.getWeather).toHaveBeenCalledTimes(2);
  });

  it('renders an explicit invalid-link state without calling providers', () => {
    render(<DestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    expect(mocks.getWeather).not.toHaveBeenCalled();
    expect(mocks.searchImages).not.toHaveBeenCalled();
  });
});
