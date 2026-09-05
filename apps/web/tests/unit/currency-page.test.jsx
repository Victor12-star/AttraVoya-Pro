import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCountries: vi.fn(),
  getCurrencyRates: vi.fn(),
  convertCurrency: vi.fn(),
  readPreferences: vi.fn(),
  savePreferences: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getCountries: mocks.getCountries,
    getCurrencyRates: mocks.getCurrencyRates,
    convertCurrency: mocks.convertCurrency,
  },
}));

vi.mock('../../src/lib/preferences.js', () => ({
  readPreferences: mocks.readPreferences,
  savePreferences: mocks.savePreferences,
}));

const { CurrencyDestinationPage } = await import(
  '../../src/features/destinations/currency-page.jsx'
);

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

function countriesResponse(currencies = null) {
  return {
    countries: [
      {
        iso2: 'SE',
        name: 'Sweden',
        currencies:
          currencies ??
          [
            {
              code: 'SEK',
              name: 'Swedish krona',
              symbol: 'kr',
              decimalDigits: 2,
              isPrimary: true,
            },
          ],
      },
    ],
  };
}

function ratesResponse() {
  return {
    currency: {
      provider: 'frankfurter',
      fetchedAt: '2026-09-05T05:00:00.000Z',
      base: 'SEK',
      approximate: true,
      rates: [
        { date: '2026-09-04', base: 'SEK', quote: 'EUR', rate: 0.091 },
        { date: '2026-09-04', base: 'SEK', quote: 'USD', rate: 0.106 },
      ],
    },
  };
}

function conversionResponse(overrides = {}) {
  return {
    conversion: {
      provider: 'frankfurter',
      fetchedAt: '2026-09-05T05:01:00.000Z',
      amount: 1000,
      from: 'EUR',
      to: 'SEK',
      rate: 10.98,
      convertedAmount: 10980,
      rateDate: '2026-09-04',
      approximate: true,
      ...overrides,
    },
  };
}

describe('CurrencyDestinationPage', () => {
  beforeEach(() => {
    mocks.getCountries.mockReset();
    mocks.getCurrencyRates.mockReset();
    mocks.convertCurrency.mockReset();
    mocks.readPreferences.mockReset();
    mocks.savePreferences.mockReset();

    mocks.getCountries.mockResolvedValue(countriesResponse());
    mocks.getCurrencyRates.mockResolvedValue(ratesResponse());
    mocks.convertCurrency.mockResolvedValue(conversionResponse());
    mocks.readPreferences.mockReturnValue({ currency: 'EUR' });
  });

  it('loads the destination currency from AttraVoya country reference data', async () => {
    render(<CurrencyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Stockholm currency & exchange', level: 1 }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Destination currencies', level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText('SEK').length).toBeGreaterThan(0);
    expect(screen.getByText(/Rate provider: Frankfurter/)).toBeInTheDocument();
    expect(mocks.getCountries).toHaveBeenCalledTimes(1);
    expect(mocks.getCurrencyRates).toHaveBeenCalledWith({ base: 'SEK' });
  });

  it('converts through the backend and clearly returns an indicative provider result', async () => {
    render(<CurrencyDestinationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Indicative currency converter', level: 2 });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }));

    expect(await screen.findByText(/10,980/)).toBeInTheDocument();
    expect(screen.getByText('1 EUR = 10.98 SEK')).toBeInTheDocument();
    expect(mocks.convertCurrency).toHaveBeenCalledWith({ amount: 1000, from: 'EUR', to: 'SEK' });
  });

  it('uses and updates the saved traveller currency only when the provider supports it', async () => {
    render(<CurrencyDestinationPage destination={destination} locale="en" messages={messages} />);

    const fromSelect = await screen.findByLabelText('From');
    expect(fromSelect).toHaveValue('EUR');

    fireEvent.change(fromSelect, { target: { value: 'USD' } });
    expect(fromSelect).toHaveValue('USD');
    expect(mocks.savePreferences).toHaveBeenCalledWith({ currency: 'USD' });
  });

  it('shows destination currency facts even when provider rates are unavailable and retries', async () => {
    mocks.getCurrencyRates
      .mockRejectedValueOnce(new Error('provider private detail'))
      .mockResolvedValueOnce(ratesResponse());

    render(<CurrencyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText(
        'The destination currency is known, but indicative exchange rates are unavailable from the configured provider right now.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/provider private detail/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('SEK').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('heading', { name: 'Indicative currency converter', level: 2 }),
    ).toBeInTheDocument();
    expect(mocks.getCurrencyRates).toHaveBeenCalledTimes(2);
  });

  it('rejects a mismatched conversion response instead of displaying the wrong currency', async () => {
    mocks.convertCurrency.mockResolvedValue(conversionResponse({ to: 'NOK' }));

    render(<CurrencyDestinationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Indicative currency converter', level: 2 });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The conversion could not be loaded. No estimate was invented.',
    );
    expect(screen.queryByText(/10,980/)).not.toBeInTheDocument();
  });

  it('renders an honest empty state when no destination currency reference exists', async () => {
    mocks.getCountries.mockResolvedValue(countriesResponse([]));

    render(<CurrencyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText(
        'AttraVoya does not have destination currency reference data for this country yet.',
      ),
    ).toBeInTheDocument();
    expect(mocks.getCurrencyRates).not.toHaveBeenCalled();
  });

  it('renders invalid destination state without calling currency APIs', async () => {
    render(<CurrencyDestinationPage destination={null} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Temporarily unavailable', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getCountries).not.toHaveBeenCalled());
  });
});
