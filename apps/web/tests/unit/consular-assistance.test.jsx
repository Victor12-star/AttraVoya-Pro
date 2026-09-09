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

const { ConsularAssistance, normalizeConsularResponse } =
  await import('../../src/features/emergency/consular-assistance.jsx');

function directoryResponse(overrides = {}) {
  return {
    consular: {
      provider: 'geoapify',
      sourceType: 'directory',
      officiallyVerified: false,
      hostCountryCode: 'SE',
      citizenshipCountryCode: 'NG',
      results: [
        {
          externalId: 'mission-1',
          name: 'Embassy of Nigeria',
          formattedAddress: 'Stockholm, Sweden',
          phone: '+46 8 123 45',
          email: 'consular@example.test',
          website: 'https://example.test/mission',
          ...overrides,
        },
      ],
    },
  };
}

async function chooseCountries() {
  const host = await screen.findByRole('combobox', { name: 'Country you are in' });
  const citizenship = screen.getByRole('combobox', { name: 'Country of citizenship' });
  fireEvent.change(host, { target: { value: 'SE' } });
  fireEvent.change(citizenship, { target: { value: 'NG' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find consular help' }));
}

describe('ConsularAssistance', () => {
  beforeEach(() => {
    mocks.getCountries.mockReset();
    mocks.request.mockReset();
    mocks.getCountries.mockResolvedValue({
      countries: [
        { iso2: 'SE', name: 'Sweden' },
        { iso2: 'NG', name: 'Nigeria' },
      ],
    });
    mocks.request.mockResolvedValue(directoryResponse());
  });

  it('shows Geoapify contacts only as unverified directory data', async () => {
    render(<ConsularAssistance locale="en" />);
    await chooseCountries();

    expect(await screen.findByText('Embassy of Nigeria')).toBeInTheDocument();
    expect(screen.getByText('Directory data · not officially verified')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+46812345');
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      'mailto:consular@example.test',
    );
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://example.test/mission',
    );
    expect(mocks.request).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/places/consular-missions?'),
      { cache: 'no-store' },
    );
  });

  it('rejects any response that tries to mark Geoapify directory data officially verified', () => {
    const response = directoryResponse();
    response.consular.officiallyVerified = true;
    expect(normalizeConsularResponse(response, 'SE', 'NG')).toBeNull();
  });

  it('does not create executable links from unsafe provider contact fields', async () => {
    mocks.request.mockResolvedValue(
      directoryResponse({
        phone: '+46 8 123;999',
        email: 'bad address@example.test',
        website: 'javascript:alert(1)',
      }),
    );

    render(<ConsularAssistance locale="en" />);
    await chooseCountries();
    expect(await screen.findByText('Embassy of Nigeria')).toBeInTheDocument();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('keeps lost-passport guidance visible when directory lookup fails', async () => {
    mocks.request.mockRejectedValue(new Error('provider unavailable'));

    render(<ConsularAssistance locale="en" />);
    await chooseCountries();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Consular directory results could not be loaded.',
    );
    await waitFor(() =>
      expect(screen.getByText('If your passport is lost or stolen')).toBeInTheDocument(),
    );
  });
});
