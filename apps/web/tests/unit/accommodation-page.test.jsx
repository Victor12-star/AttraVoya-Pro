import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getNearbyAccommodation: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getNearbyAccommodation: mocks.getNearbyAccommodation,
  },
}));

const { AccommodationPage } =
  await import('../../src/features/destinations/accommodation-page.jsx');

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

function accommodationResponse() {
  return {
    accommodation: {
      provider: 'geoapify',
      fetchedAt: '2026-09-04T19:45:00.000Z',
      inventoryDataAvailable: false,
      results: [
        {
          provider: 'geoapify',
          externalId: 'hotel-one',
          name: 'Example Hotel',
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.34,
          longitude: 18.07,
          distanceMeters: 1800,
          website: 'https://example.com/',
          accommodationType: 'HOTEL',
          livePrice: null,
          liveAvailability: null,
          photos: [],
        },
        {
          provider: 'geoapify',
          externalId: 'hostel-two',
          name: 'Central Hostel',
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.33,
          longitude: 18.06,
          distanceMeters: 620,
          website: 'javascript:alert(1)',
          accommodationType: 'HOSTEL',
          livePrice: null,
          liveAvailability: null,
          photos: [],
        },
      ],
    },
  };
}

function accommodationPhotoResponse() {
  return {
    accommodation: {
      provider: 'authorized-stay-provider',
      fetchedAt: '2026-09-08T10:00:00.000Z',
      inventoryDataAvailable: true,
      results: [
        {
          provider: 'authorized-stay-provider',
          externalId: 'hotel-with-media',
          name: 'Example Hotel',
          formattedAddress: 'Stockholm, Sweden',
          latitude: 59.34,
          longitude: 18.07,
          distanceMeters: 1800,
          accommodationType: 'HOTEL',
          photos: [
            {
              id: 'exterior',
              url: 'https://media.example.com/hotel/exterior.jpg',
              thumbnailUrl: 'https://media.example.com/hotel/exterior-thumb.jpg',
              category: 'EXTERIOR',
              alt: 'Example Hotel exterior',
              provider: 'Authorized Stay Provider',
              attribution: 'Authorized Stay Provider media',
            },
            {
              id: 'room',
              url: 'https://media.example.com/hotel/room.jpg',
              category: 'ROOM',
              alt: 'Example Hotel room interior',
              provider: 'Authorized Stay Provider',
            },
            {
              id: 'bed',
              url: 'https://media.example.com/hotel/bed.jpg',
              category: 'BED',
              alt: 'Example Hotel bed',
              provider: 'Authorized Stay Provider',
            },
            {
              id: 'unsafe',
              url: 'javascript:alert(1)',
              category: 'ROOM',
              alt: 'Unsafe image',
            },
          ],
        },
      ],
    },
  };
}

describe('AccommodationPage', () => {
  beforeEach(() => {
    mocks.getNearbyAccommodation.mockReset();
    mocks.getNearbyAccommodation.mockResolvedValue(accommodationResponse());
  });

  it('renders real lodging locations without inventing live inventory or property photos', async () => {
    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Places to stay near Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Example Hotel', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Central Hostel', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('620 m')).toBeInTheDocument();
    expect(screen.getByText('1.8 km')).toBeInTheDocument();
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Location data only. Live room prices and availability are not connected yet.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Property photos are not available from this provider.'),
    ).toHaveLength(2);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();

    expect(mocks.getNearbyAccommodation).toHaveBeenCalledWith({
      latitude: 59.3293,
      longitude: 18.0686,
      radiusMeters: 10000,
      limit: 24,
      language: 'en',
      types: [],
    });
  });

  it('shows provider-supplied exterior, room and bed photos in an accessible gallery', async () => {
    mocks.getNearbyAccommodation.mockResolvedValue(accommodationPhotoResponse());

    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Example Hotel', level: 2 });
    expect(screen.getByRole('img', { name: 'Example Hotel exterior' })).toHaveAttribute(
      'src',
      'https://media.example.com/hotel/exterior.jpg',
    );
    expect(screen.queryByRole('img', { name: 'Unsafe image' })).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'View photos: Example Hotel' }).click();

    const dialog = await screen.findByRole('dialog', { name: 'Example Hotel photos' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Exterior')).toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Photo source: Authorized Stay Provider media')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Next photo' }).click();
    expect(
      await screen.findByRole('img', { name: 'Example Hotel room interior' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Room')).toBeInTheDocument();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Next photo' }).click();
    expect(await screen.findByRole('img', { name: 'Example Hotel bed' })).toBeInTheDocument();
    expect(screen.getByText('Bed')).toBeInTheDocument();
    expect(screen.getByText('3 of 3')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Close photos' }).click();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('falls back across failed provider photos instead of leaving broken hotel media', async () => {
    mocks.getNearbyAccommodation.mockResolvedValue(accommodationPhotoResponse());

    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Example Hotel', level: 2 });
    fireEvent.error(screen.getByRole('img', { name: 'Example Hotel exterior' }));
    expect(
      await screen.findByRole('img', { name: 'Example Hotel room interior' }),
    ).toBeInTheDocument();

    fireEvent.error(screen.getByRole('img', { name: 'Example Hotel room interior' }));
    expect(await screen.findByRole('img', { name: 'Example Hotel bed' })).toBeInTheDocument();

    fireEvent.error(screen.getByRole('img', { name: 'Example Hotel bed' }));
    expect(
      await screen.findByText('Property photos are not available from this provider.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View photos' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View photos: Example Hotel' }),
    ).not.toBeInTheDocument();
  });

  it('restores keyboard focus to the control that opened the hotel photo gallery', async () => {
    mocks.getNearbyAccommodation.mockResolvedValue(accommodationPhotoResponse());

    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Example Hotel', level: 2 });
    const trigger = screen.getByRole('button', { name: 'View photos' });
    trigger.focus();
    trigger.click();

    const closeButton = await screen.findByRole('button', { name: 'Close photos' });
    await waitFor(() => expect(closeButton).toHaveFocus());
    closeButton.click();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('keeps Tab and Shift+Tab focus inside the hotel photo gallery', async () => {
    mocks.getNearbyAccommodation.mockResolvedValue(accommodationPhotoResponse());

    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Example Hotel', level: 2 });
    screen.getByRole('button', { name: 'View photos' }).click();

    const closeButton = await screen.findByRole('button', { name: 'Close photos' });
    const nextButton = screen.getByRole('button', { name: 'Next photo' });
    await waitFor(() => expect(closeButton).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(nextButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
  });

  it('refetches through the dedicated accommodation API when a supported type is selected', async () => {
    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Example Hotel', level: 2 });
    screen.getByRole('button', { name: 'Hotels' }).click();

    await waitFor(() =>
      expect(mocks.getNearbyAccommodation).toHaveBeenLastCalledWith({
        latitude: 59.3293,
        longitude: 18.0686,
        radiusMeters: 10000,
        limit: 24,
        language: 'en',
        types: ['HOTEL'],
      }),
    );
    expect(screen.getByRole('button', { name: 'Hotels' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an honest empty state when the provider returns no lodging locations', async () => {
    mocks.getNearbyAccommodation.mockResolvedValue({
      accommodation: {
        provider: 'geoapify',
        inventoryDataAvailable: false,
        results: [],
      },
    });

    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No lodging locations were found in this search area.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Example Hotel' })).not.toBeInTheDocument();
  });

  it('hides provider failure details and retries through the same accommodation contract', async () => {
    mocks.getNearbyAccommodation
      .mockRejectedValueOnce(new Error('secret provider details must never leak'))
      .mockResolvedValueOnce(accommodationResponse());

    render(<AccommodationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Accommodation locations could not be loaded right now.',
    );
    expect(screen.queryByText(/secret provider details/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(
      await screen.findByRole('heading', { name: 'Example Hotel', level: 2 }),
    ).toBeInTheDocument();
    expect(mocks.getNearbyAccommodation).toHaveBeenCalledTimes(2);
  });

  it('renders invalid destination state without calling the accommodation provider', async () => {
    render(<AccommodationPage destination={null} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Temporarily unavailable', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getNearbyAccommodation).not.toHaveBeenCalled());
  });
});
