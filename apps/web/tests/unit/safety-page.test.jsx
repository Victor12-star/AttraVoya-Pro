import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getEmergencyRecords: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getEmergencyRecords: mocks.getEmergencyRecords,
  },
}));

const { SafetyDestinationPage } = await import('../../src/features/destinations/safety-page.jsx');

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

function emergencyResponse() {
  return {
    emergency: {
      countryCode: 'SE',
      records: [
        {
          id: 'emergency-se-general',
          service: 'GENERAL_EMERGENCY',
          serviceLabel: 'General emergency',
          phoneNumber: '112',
          sourceName: 'Official emergency authority',
          sourceUrl: 'https://example.gov/emergency',
          lastVerifiedAt: '2026-08-01T10:00:00.000Z',
        },
      ],
    },
  };
}

describe('SafetyDestinationPage', () => {
  beforeEach(() => {
    mocks.getEmergencyRecords.mockReset();
    mocks.getEmergencyRecords.mockResolvedValue(emergencyResponse());
  });

  it('shows only the verified emergency records returned by AttraVoya', async () => {
    render(<SafetyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', {
        name: 'Verified emergency contacts for Stockholm',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'General emergency', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('112')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:112');
    expect(screen.getByRole('link', { name: /Official emergency authority/ })).toHaveAttribute(
      'href',
      'https://example.gov/emergency',
    );
    expect(mocks.getEmergencyRecords).toHaveBeenCalledWith({ countryCode: 'SE' });
  });

  it('renders an honest empty state when no verified records are published', async () => {
    mocks.getEmergencyRecords.mockResolvedValue({
      emergency: { countryCode: 'SE', records: [] },
    });

    render(<SafetyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText(
        'No verified country-wide emergency contacts are available in AttraVoya for this destination yet.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Call' })).not.toBeInTheDocument();
  });

  it('hides backend failure details and retries', async () => {
    mocks.getEmergencyRecords
      .mockRejectedValueOnce(new Error('private database detail'))
      .mockResolvedValueOnce(emergencyResponse());

    render(<SafetyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Verified emergency information could not be loaded right now.',
    );
    expect(screen.queryByText(/private database detail/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('heading', { name: 'General emergency', level: 2 }),
    ).toBeInTheDocument();
    expect(mocks.getEmergencyRecords).toHaveBeenCalledTimes(2);
  });

  it('rejects mismatched response country context rather than showing another country numbers', async () => {
    mocks.getEmergencyRecords.mockResolvedValue({
      emergency: {
        countryCode: 'NO',
        records: emergencyResponse().emergency.records,
      },
    });

    render(<SafetyDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('112')).not.toBeInTheDocument();
  });

  it('renders invalid destination state without calling the emergency API', async () => {
    render(<SafetyDestinationPage destination={null} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Temporarily unavailable', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => expect(mocks.getEmergencyRecords).not.toHaveBeenCalled());
  });
});
