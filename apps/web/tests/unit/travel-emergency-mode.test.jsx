import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCountries: vi.fn(),
  request: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getCountries: mocks.getCountries,
    request: mocks.request,
  },
}));

const { TravelEmergencyMode, emergencyPhoneHref, normalizeEmergencyResponse } =
  await import('../../src/features/emergency/travel-emergency-mode.jsx');

const messages = {
  common: {
    chooseCountry: 'Choose country',
    loading: 'Loading…',
  },
};

function emergencyResponse(overrides = {}) {
  return {
    emergency: {
      countryCode: 'SE',
      records: [
        {
          id: 'se-general-112',
          service: 'GENERAL',
          serviceLabel: 'Emergency services',
          phoneNumber: '112',
          sourceName: 'Swedish authorities',
          sourceUrl: 'https://example.gov/emergency',
          lastVerifiedAt: '2026-09-01T12:00:00.000Z',
          ...overrides,
        },
      ],
    },
  };
}

async function chooseSweden() {
  const select = await screen.findByRole('combobox', { name: 'Choose country' });
  fireEvent.change(select, { target: { value: 'SE' } });
}

describe('TravelEmergencyMode', () => {
  beforeEach(() => {
    mocks.getCountries.mockReset();
    mocks.request.mockReset();
    mocks.getCountries.mockResolvedValue({
      countries: [
        { iso2: 'SE', name: 'Sweden' },
        { iso2: 'ES', name: 'Spain' },
      ],
    });
    mocks.request.mockResolvedValue(emergencyResponse());
  });

  it('loads only the selected country emergency endpoint and exposes verified telephone-safe contacts', async () => {
    render(<TravelEmergencyMode locale="en" messages={messages} />);
    await chooseSweden();

    expect(await screen.findByText('Emergency services')).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledWith('/api/v1/emergency?countryCode=SE', {
      cache: 'no-store',
    });

    const call = screen.getByRole('link', { name: 'Call' });
    expect(call).toHaveAttribute('href', 'tel:112');
    const source = screen.getByRole('link', { name: 'Official source' });
    expect(source).toHaveAttribute('href', 'https://example.gov/emergency');
    expect(source).toHaveAttribute('target', '_blank');
    expect(screen.getByText(/Swedish authorities/)).toBeInTheDocument();
  });

  it('never creates a tel link from phone text containing an unsafe character', async () => {
    mocks.request.mockResolvedValue(emergencyResponse({ phoneNumber: '112;999' }));

    render(<TravelEmergencyMode locale="en" messages={messages} />);
    await chooseSweden();

    expect(await screen.findByText('112;999')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Call' })).not.toBeInTheDocument();
    expect(screen.getByText('Call link unavailable')).toBeInTheDocument();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it('rejects a response for a different country instead of showing stale or invented contacts', async () => {
    const response = emergencyResponse();
    response.emergency.countryCode = 'ES';
    mocks.request.mockResolvedValue(response);

    render(<TravelEmergencyMode locale="en" messages={messages} />);
    await chooseSweden();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Emergency contacts could not be loaded right now. No emergency number was invented.',
    );
    expect(screen.queryByText('112')).not.toBeInTheDocument();
  });

  it('shows a truthful empty state when the backend has no verified records', async () => {
    mocks.request.mockResolvedValue({ emergency: { countryCode: 'SE', records: [] } });

    render(<TravelEmergencyMode locale="en" messages={messages} />);
    await chooseSweden();

    expect(
      await screen.findByText(
        'No verified emergency contacts are available for this country yet. Do not guess a number.',
      ),
    ).toBeInTheDocument();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it('does not let malformed source URLs into the normalized emergency record set', () => {
    const response = emergencyResponse({ sourceUrl: 'javascript:alert(1)' });
    const normalized = normalizeEmergencyResponse(response, 'SE');

    expect(normalized).toEqual({ countryCode: 'SE', records: [] });
    expect(emergencyPhoneHref('+46 (0) 12-34')).toBe('tel:+4601234');
    expect(emergencyPhoneHref('112;999')).toBeNull();
  });

  it('ignores a stale country request that resolves after a newer selection', async () => {
    let resolveSweden;
    const swedenPromise = new Promise((resolve) => {
      resolveSweden = resolve;
    });
    mocks.request.mockImplementation((path) => {
      if (String(path).includes('countryCode=SE')) return swedenPromise;
      return Promise.resolve({
        emergency: {
          countryCode: 'ES',
          records: [
            {
              id: 'es-general-112',
              service: 'GENERAL',
              serviceLabel: 'Spain emergency services',
              phoneNumber: '112',
              sourceName: 'Spanish authorities',
              sourceUrl: 'https://example.es/emergency',
              lastVerifiedAt: '2026-09-01T12:00:00.000Z',
            },
          ],
        },
      });
    });

    render(<TravelEmergencyMode locale="en" messages={messages} />);
    const select = await screen.findByRole('combobox', { name: 'Choose country' });
    fireEvent.change(select, { target: { value: 'SE' } });
    fireEvent.change(select, { target: { value: 'ES' } });

    expect(await screen.findByText('Spain emergency services')).toBeInTheDocument();
    resolveSweden(emergencyResponse());
    await waitFor(() => expect(screen.queryByText('Emergency services')).not.toBeInTheDocument());
    expect(screen.getByText('Spain emergency services')).toBeInTheDocument();
  });
});
