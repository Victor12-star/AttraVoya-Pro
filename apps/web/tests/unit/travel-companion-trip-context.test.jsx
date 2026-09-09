import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCountries: vi.fn(),
  request: vi.fn(),
  translateText: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getCountries: mocks.getCountries,
    request: mocks.request,
    translateText: mocks.translateText,
  },
}));

const { TravelCompanionPage } =
  await import('../../src/features/language/travel-companion-page.jsx');

const messages = {
  common: {
    loading: 'Loading…',
    chooseCountry: 'Choose country',
    clear: 'Clear',
  },
};

function phrasebookResponse(countryCode) {
  const sweden = countryCode === 'SE';
  return {
    phrasebook: {
      sourceLanguage: { code: 'en', name: 'English' },
      destination: {
        countryCode,
        countryName: sweden ? 'Sweden' : 'Spain',
        knownCountry: true,
        preferredTargetLanguage: sweden ? 'sv' : 'es',
        languages: [
          {
            code: sweden ? 'sv' : 'es',
            name: sweden ? 'Swedish' : 'Spanish',
            nativeName: sweden ? 'Svenska' : 'Español',
            direction: 'ltr',
            available: true,
          },
        ],
      },
      provider: { name: 'libretranslate', fetchedAt: '2026-09-09T15:00:00.000Z' },
      categories: [
        {
          id: 'greetings',
          name: 'Greetings',
          phrases: [{ id: 'hello', text: 'Hello.' }],
        },
      ],
    },
  };
}

function tripContextResponse() {
  return {
    tripContext: {
      suggestedTripId: 'trip-active',
      source: 'ACTIVE_TRIP',
      trips: [
        {
          id: 'trip-active',
          title: 'Stockholm now',
          status: 'ACTIVE',
          startDate: '2026-09-08',
          endDate: '2026-09-12',
          destination: {
            id: 'destination-stockholm',
            slug: 'stockholm-sweden',
            name: 'Stockholm',
            countryCode: 'SE',
            countryName: 'Sweden',
          },
        },
        {
          id: 'trip-planned',
          title: 'Madrid next',
          status: 'PLANNED',
          startDate: '2026-10-10',
          endDate: '2026-10-15',
          destination: {
            id: 'destination-madrid',
            slug: 'madrid-spain',
            name: 'Madrid',
            countryCode: 'ES',
            countryName: 'Spain',
          },
        },
      ],
    },
  };
}

describe('TravelCompanionPage trip context', () => {
  beforeEach(() => {
    mocks.getCountries.mockReset();
    mocks.request.mockReset();
    mocks.translateText.mockReset();
    mocks.getCountries.mockResolvedValue({
      countries: [
        { iso2: 'SE', name: 'Sweden' },
        { iso2: 'ES', name: 'Spain' },
      ],
    });
    mocks.request.mockImplementation(async (path) => {
      if (path === '/api/v1/trips/companion-context') return tripContextResponse();
      if (path.includes('countryCode=SE')) return phrasebookResponse('SE');
      if (path.includes('countryCode=ES')) return phrasebookResponse('ES');
      throw new Error('Unexpected request');
    });
  });

  it('selects the authenticated current trip destination and its supported language', async () => {
    render(<TravelCompanionPage locale="en" messages={messages} />);

    const countrySelect = await screen.findByRole('combobox', { name: 'Choose country' });
    await waitFor(() => expect(countrySelect).toHaveValue('SE'));

    const tripSelect = screen.getByRole('combobox', { name: /^Your trip/ });
    expect(tripSelect).toHaveValue('trip-active');
    expect(screen.getByText(/Current destination selected from Stockholm now/)).toBeInTheDocument();
    expect(await screen.findByText('Hello.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Translate to' })).toHaveValue('sv');
    expect(mocks.request).toHaveBeenCalledWith('/api/v1/trips/companion-context', {
      cache: 'no-store',
    });
    expect(mocks.request).toHaveBeenCalledWith('/api/v1/phrasebook?countryCode=SE', {
      cache: 'force-cache',
    });
  });

  it('lets the traveller switch to another saved trip without inventing destination data', async () => {
    render(<TravelCompanionPage locale="en" messages={messages} />);

    const tripSelect = await screen.findByRole('combobox', { name: /^Your trip/ });
    await waitFor(() => expect(tripSelect).toHaveValue('trip-active'));
    fireEvent.change(tripSelect, { target: { value: 'trip-planned' } });

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Choose country' })).toHaveValue('ES'),
    );
    expect(screen.getByText(/Current destination selected from Madrid next/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Translate to' })).toHaveValue('es');
  });

  it('never overwrites a manual country choice when saved trip context arrives later', async () => {
    let resolveTrips;
    const delayedTrips = new Promise((resolve) => {
      resolveTrips = resolve;
    });
    mocks.request.mockImplementation(async (path) => {
      if (path === '/api/v1/trips/companion-context') return delayedTrips;
      if (path.includes('countryCode=SE')) return phrasebookResponse('SE');
      if (path.includes('countryCode=ES')) return phrasebookResponse('ES');
      throw new Error('Unexpected request');
    });

    render(<TravelCompanionPage locale="en" messages={messages} />);
    const countrySelect = await screen.findByRole('combobox', { name: 'Choose country' });
    fireEvent.change(countrySelect, { target: { value: 'ES' } });
    await waitFor(() => expect(countrySelect).toHaveValue('ES'));

    resolveTrips(tripContextResponse());
    await screen.findByRole('combobox', { name: /^Your trip/ });
    await waitFor(() => expect(countrySelect).toHaveValue('ES'));
    expect(mocks.request).not.toHaveBeenCalledWith('/api/v1/phrasebook?countryCode=SE', {
      cache: 'force-cache',
    });
  });

  it('keeps manual destination selection working when the traveller is signed out', async () => {
    mocks.request.mockImplementation(async (path) => {
      if (path === '/api/v1/trips/companion-context') {
        const error = /** @type {any} */ (new Error('Authentication required'));
        error.status = 401;
        throw error;
      }
      if (path.includes('countryCode=SE')) return phrasebookResponse('SE');
      throw new Error('Unexpected request');
    });

    render(<TravelCompanionPage locale="en" messages={messages} />);
    const countrySelect = await screen.findByRole('combobox', { name: 'Choose country' });
    fireEvent.change(countrySelect, { target: { value: 'SE' } });

    expect(await screen.findByText('Hello.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^Your trip/ })).not.toBeInTheDocument();
  });
});