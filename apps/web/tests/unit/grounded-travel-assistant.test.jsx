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

const { GroundedTravelAssistant, classifyGroundedTravelQuestion, normalizeAssistantEmergency } =
  await import('../../src/features/language/grounded-travel-assistant.jsx');

const messages = {
  common: {
    chooseCountry: 'Choose country',
    loading: 'Loading…',
  },
};

function phrasebookResponse(countryCode = 'SE', countryName = 'Sweden') {
  return {
    phrasebook: {
      sourceLanguage: { code: 'en', name: 'English' },
      destination: {
        countryCode,
        countryName,
        preferredTargetLanguage: 'sv',
        languages: [
          {
            code: 'sv',
            name: 'Swedish',
            nativeName: 'Svenska',
            direction: 'ltr',
            available: true,
          },
        ],
      },
      provider: { name: 'libretranslate' },
      categories: [
        {
          id: 'greetings',
          name: 'Greetings',
          phrases: [
            { id: 'hello', text: 'Hello.' },
            { id: 'thank-you', text: 'Thank you.' },
          ],
        },
        {
          id: 'transport',
          name: 'Transport',
          phrases: [{ id: 'station', text: 'Where is the station?' }],
        },
      ],
    },
  };
}

function emergencyResponse() {
  return {
    emergency: {
      countryCode: 'SE',
      records: [
        {
          id: 'se-112',
          service: 'GENERAL_EMERGENCY',
          serviceLabel: 'General emergency',
          phoneNumber: '112',
          sourceName: 'SOS Alarm',
          sourceUrl: 'https://www.sosalarm.se/',
          lastVerifiedAt: '2026-09-01T10:00:00.000Z',
        },
      ],
    },
  };
}

async function chooseSweden() {
  const select = await screen.findByRole('combobox', { name: 'Assistant destination' });
  await waitFor(() => expect(select).not.toBeDisabled());
  expect(screen.getByRole('option', { name: 'Sweden' })).toBeInTheDocument();
  fireEvent.change(select, { target: { value: 'SE' } });
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith('/api/v1/phrasebook?countryCode=SE', {
      cache: 'force-cache',
    }),
  );
}

describe('GroundedTravelAssistant', () => {
  beforeEach(() => {
    mocks.getCountries.mockReset();
    mocks.request.mockReset();
    mocks.getCountries.mockResolvedValue({ countries: [{ iso2: 'SE', name: 'Sweden' }] });
    mocks.request.mockImplementation((path) => {
      if (String(path).startsWith('/api/v1/emergency')) return Promise.resolve(emergencyResponse());
      return Promise.resolve(phrasebookResponse());
    });
  });

  it('answers a language question only from the normalized destination phrasebook', async () => {
    render(<GroundedTravelAssistant locale="en" messages={messages} />);
    await chooseSweden();

    fireEvent.click(screen.getByRole('button', { name: 'Which local language should I use?' }));

    expect(
      await screen.findByText(
        'For Sweden, the supported destination language is: Swedish (Svenska).',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('AttraVoya phrasebook reference')).toBeInTheDocument();
    expect(screen.getByText('LibreTranslate')).toBeInTheDocument();
  });

  it('surfaces verified emergency records and their authoritative source without inventing a number', async () => {
    render(<GroundedTravelAssistant locale="en" messages={messages} />);
    await chooseSweden();

    fireEvent.click(screen.getByRole('button', { name: 'What emergency contacts are verified?' }));

    expect(await screen.findByText('General emergency')).toBeInTheDocument();
    expect(screen.getByText('112')).toBeInTheDocument();
    const source = screen.getByRole('link', { name: /SOS Alarm/ });
    expect(source).toHaveAttribute('href', 'https://www.sosalarm.se/');
    expect(mocks.request).toHaveBeenCalledWith('/api/v1/emergency?countryCode=SE', {
      cache: 'no-store',
    });
  });

  it('refuses unsupported questions instead of sending them to an unconfigured AI provider', async () => {
    render(<GroundedTravelAssistant locale="en" messages={messages} />);
    await chooseSweden();

    fireEvent.change(screen.getByLabelText('Ask a travel question…'), {
      target: { value: 'Which hotel has the best room tonight?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(
      await screen.findByText(
        'I cannot answer that from the trusted travel data available in this release. Try a language, useful-phrase, emergency, embassy, or passport question.',
      ),
    ).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });

  it('routes lost-passport questions to Travel Emergency Mode rather than inventing consular rules', async () => {
    const scrollIntoView = vi.fn();
    const heading = document.createElement('h2');
    heading.id = 'travel-emergency-title';
    Object.defineProperty(heading, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    document.body.append(heading);

    render(<GroundedTravelAssistant locale="en" messages={messages} />);
    await chooseSweden();
    fireEvent.click(
      screen.getByRole('button', { name: 'I lost my passport. Where is embassy help?' }),
    );

    expect(
      await screen.findByText(/Use Travel Emergency Mode below for embassy and lost-passport help/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Travel Emergency Mode' }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    heading.remove();
  });

  it('rejects malformed emergency source URLs at the normalization boundary', () => {
    const malformed = emergencyResponse();
    malformed.emergency.records[0].sourceUrl = 'javascript:alert(1)';
    expect(normalizeAssistantEmergency(malformed, 'SE')).toEqual({
      countryCode: 'SE',
      records: [],
    });
  });

  it('recognizes supported multilingual intent terms deterministically', () => {
    expect(classifyGroundedTravelQuestion('Vilket språk ska jag tala?')).toBe('language');
    expect(classifyGroundedTravelQuestion('¿Dónde está la embajada para mi pasaporte?')).toBe(
      'consular',
    );
    expect(classifyGroundedTravelQuestion('紧急电话是多少？')).toBe('emergency');
    expect(classifyGroundedTravelQuestion('איך מזג האוויר?')).toBe('unsupported');
  });
});
