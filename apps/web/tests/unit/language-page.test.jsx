import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCountries: vi.fn(),
  getTranslationLanguages: vi.fn(),
  translateText: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getCountries: mocks.getCountries,
    getTranslationLanguages: mocks.getTranslationLanguages,
    translateText: mocks.translateText,
  },
}));

const { LanguageDestinationPage } =
  await import('../../src/features/destinations/language-page.jsx');

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

function countriesResponse(languages = null) {
  return {
    countries: [
      {
        iso2: 'SE',
        name: 'Sweden',
        languages: languages ?? [
          {
            code: 'sv',
            name: 'Swedish',
            nativeName: 'Svenska',
            direction: 'ltr',
            isUiSupported: true,
            isOfficial: true,
            isCommon: true,
            rank: 1,
          },
        ],
      },
    ],
  };
}

function translationLanguagesResponse(languages = null) {
  return {
    translation: {
      provider: 'libretranslate',
      fetchedAt: '2026-09-05T06:30:00.000Z',
      languages: languages ?? [
        { code: 'en', name: 'English', targets: ['sv'] },
        { code: 'sv', name: 'Swedish', targets: ['en'] },
      ],
    },
  };
}

function translationResponse(overrides = {}) {
  return {
    translation: {
      provider: 'libretranslate',
      fetchedAt: '2026-09-05T06:31:00.000Z',
      source: 'auto',
      target: 'sv',
      translatedText: 'Hej',
      detectedLanguage: { code: 'en', confidence: 99 },
      ...overrides,
    },
  };
}

describe('LanguageDestinationPage', () => {
  beforeEach(() => {
    mocks.getCountries.mockReset();
    mocks.getTranslationLanguages.mockReset();
    mocks.translateText.mockReset();

    mocks.getCountries.mockResolvedValue(countriesResponse());
    mocks.getTranslationLanguages.mockResolvedValue(translationLanguagesResponse());
    mocks.translateText.mockResolvedValue(translationResponse());
  });

  it('loads factual destination languages from AttraVoya country reference data', async () => {
    render(<LanguageDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Stockholm languages', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        name: 'Languages used in the destination country',
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Swedish', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Svenska')).toBeInTheDocument();
    expect(screen.getByText('Official')).toBeInTheDocument();
    expect(screen.getByText('Common')).toBeInTheDocument();
    expect(mocks.getCountries).toHaveBeenCalledTimes(1);
  });

  it('uses only the AttraVoya backend for optional machine translation', async () => {
    render(<LanguageDestinationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Machine translation helper', level: 2 });
    fireEvent.change(screen.getByLabelText('Phrase'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Translate' }));

    expect(await screen.findByText('Hej')).toBeInTheDocument();
    expect(mocks.translateText).toHaveBeenCalledWith({ text: 'Hello', source: 'auto', target: 'sv' });
    expect(screen.getAllByText('LibreTranslate').length).toBeGreaterThan(0);
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('keeps factual language information visible when no destination language is provider-supported', async () => {
    mocks.getTranslationLanguages.mockResolvedValue(
      translationLanguagesResponse([{ code: 'en', name: 'English', targets: ['de'] }]),
    );

    render(<LanguageDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByText('Svenska')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The configured machine-translation provider does not currently support any listed destination language.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Translate' })).not.toBeInTheDocument();
    expect(mocks.translateText).not.toHaveBeenCalled();
  });

  it('shows an honest provider-support error and retries without hiding reference facts', async () => {
    mocks.getTranslationLanguages
      .mockRejectedValueOnce(new Error('private provider detail'))
      .mockResolvedValueOnce(translationLanguagesResponse());

    render(<LanguageDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByText('Svenska')).toBeInTheDocument();
    expect(
      screen.getByText('Machine-translation language support could not be checked right now.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/private provider detail/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('heading', { name: 'Machine translation helper', level: 2 }),
    ).toBeInTheDocument();
    expect(mocks.getTranslationLanguages).toHaveBeenCalledTimes(2);
  });

  it('rejects a mismatched translation response instead of displaying the wrong target text', async () => {
    mocks.translateText.mockResolvedValue(
      translationResponse({ target: 'de', translatedText: 'Hallo' }),
    );

    render(<LanguageDestinationPage destination={destination} locale="en" messages={messages} />);

    await screen.findByRole('heading', { name: 'Machine translation helper', level: 2 });
    fireEvent.change(screen.getByLabelText('Phrase'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Translate' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The translation could not be loaded. No translation was invented.',
    );
    expect(screen.queryByText('Hallo')).not.toBeInTheDocument();
  });

  it('renders an honest empty state when no destination language reference exists', async () => {
    mocks.getCountries.mockResolvedValue(countriesResponse([]));

    render(<LanguageDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText(
        'AttraVoya does not have destination-language reference data for this country yet.',
      ),
    ).toBeInTheDocument();
    expect(mocks.getTranslationLanguages).not.toHaveBeenCalled();
  });

  it('renders invalid destination state without calling language or translation APIs', async () => {
    render(<LanguageDestinationPage destination={null} locale="en" messages={messages} />);

    expect(
      screen.getByRole('heading', { name: 'Temporarily unavailable', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    await waitFor(() => {
      expect(mocks.getCountries).not.toHaveBeenCalled();
      expect(mocks.getTranslationLanguages).not.toHaveBeenCalled();
      expect(mocks.translateText).not.toHaveBeenCalled();
    });
  });
});
