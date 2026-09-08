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

function phrasebookResponse() {
  return {
    phrasebook: {
      sourceLanguage: { code: 'en', name: 'English' },
      destination: {
        countryCode: 'SE',
        countryName: 'Sweden',
        knownCountry: true,
        preferredTargetLanguage: 'sv',
        languages: [
          {
            code: 'sv',
            name: 'Swedish',
            nativeName: 'Svenska',
            direction: 'ltr',
            isOfficial: true,
            isCommon: true,
            available: true,
          },
        ],
      },
      provider: { name: 'libretranslate', fetchedAt: '2026-09-07T21:00:00.000Z' },
      categories: [
        {
          id: 'greetings',
          name: 'Greetings and courtesy',
          phrases: [
            { id: 'hello', text: 'Hello.' },
            { id: 'how-are-you', text: 'How are you?' },
          ],
        },
        {
          id: 'shopping',
          name: 'Shopping and payments',
          phrases: [{ id: 'how-much', text: 'How much is this?' }],
        },
      ],
    },
  };
}

function translationResponse(overrides = {}) {
  return {
    translation: {
      provider: 'libretranslate',
      source: 'en',
      target: 'sv',
      translatedText: 'Hej.',
      ...overrides,
    },
  };
}

async function chooseSweden() {
  const countrySelect = await screen.findByRole('combobox', { name: 'Choose country' });
  fireEvent.change(countrySelect, { target: { value: 'SE' } });
  expect(await screen.findByText('Hello.')).toBeInTheDocument();
}

describe('TravelCompanionPage', () => {
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
    mocks.request.mockResolvedValue(phrasebookResponse());
    mocks.translateText.mockResolvedValue(translationResponse());

    const currentWindow = /** @type {any} */ (window);
    delete currentWindow.SpeechRecognition;
    delete currentWindow.webkitSpeechRecognition;
    delete currentWindow.SpeechSynthesisUtterance;
    delete currentWindow.speechSynthesis;
  });

  it('uses destination-aware quick phrases and sends English to the selected local language by default', async () => {
    render(<TravelCompanionPage locale="en" messages={messages} />);
    await chooseSweden();

    fireEvent.click(screen.getByRole('button', { name: 'Hello.' }));

    expect(await screen.findByText('Hej.')).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledWith('/api/v1/phrasebook?countryCode=SE', {
      cache: 'force-cache',
    });
    expect(mocks.translateText).toHaveBeenCalledWith({
      text: 'Hello.',
      source: 'en',
      target: 'sv',
    });
    expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Swedish').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'How are you?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How much is this?' })).toBeInTheDocument();
  });

  it('switches the interpreter direction and translates the local language back to English', async () => {
    mocks.translateText.mockResolvedValue(
      translationResponse({ source: 'sv', target: 'en', translatedText: 'Hello.' }),
    );

    render(<TravelCompanionPage locale="en" messages={messages} />);
    await chooseSweden();

    fireEvent.click(screen.getByRole('button', { name: 'Swap speaking direction' }));
    fireEvent.change(screen.getByLabelText('Phrase'), { target: { value: 'Hej.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Translate' }));

    expect(await screen.findByText('Hello.')).toBeInTheDocument();
    expect(mocks.translateText).toHaveBeenCalledWith({
      text: 'Hej.',
      source: 'sv',
      target: 'en',
    });
    expect(screen.queryByRole('button', { name: 'How are you?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show to local' })).not.toBeInTheDocument();
  });

  it('translates traveller-entered everyday text and keeps the result in session-only chat history', async () => {
    mocks.translateText.mockResolvedValue(
      translationResponse({ translatedText: 'Hur mycket kostar det här?' }),
    );

    render(<TravelCompanionPage locale="en" messages={messages} />);
    await chooseSweden();

    fireEvent.change(screen.getByLabelText('Phrase'), {
      target: { value: 'How much is this?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Translate' }));

    expect(await screen.findByText('Hur mycket kostar det här?')).toBeInTheDocument();
    expect(screen.getAllByText('How much is this?').length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Your translated phrases will appear here.')).toBeInTheDocument();
  });

  it('presents a translated destination-language phrase in an accessible Show to Local card', async () => {
    render(<TravelCompanionPage locale="en" messages={messages} />);
    await chooseSweden();
    fireEvent.click(screen.getByRole('button', { name: 'Hello.' }));
    await screen.findByText('Hej.');

    fireEvent.click(screen.getByRole('button', { name: 'Show to local' }));

    const dialog = screen.getByRole('dialog', { name: 'Show to local' });
    expect(dialog).toHaveTextContent('Hej.');
    expect(dialog).toHaveTextContent('Swedish');
    expect(dialog).toHaveTextContent('Turn the screen toward the person you are speaking with.');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Show to local' })).not.toBeInTheDocument();
  });

  it('rejects a translation returned for the wrong source or target language', async () => {
    mocks.translateText.mockResolvedValue(
      translationResponse({ target: 'de', translatedText: 'Hallo.' }),
    );

    render(<TravelCompanionPage locale="en" messages={messages} />);
    await chooseSweden();
    fireEvent.click(screen.getByRole('button', { name: 'Hello.' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The translation could not be loaded. No translation was invented.',
    );
    expect(screen.queryByText('Hallo.')).not.toBeInTheDocument();
  });

  it('speaks a translated phrase when browser speech synthesis is available', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    const voice = { lang: 'sv-SE' };
    class FakeUtterance {
      /** @param {string} text */
      constructor(text) {
        this.text = text;
        this.lang = '';
        this.voice = null;
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: FakeUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel, getVoices: () => [voice] },
    });

    render(<TravelCompanionPage locale="en" messages={messages} />);
    await chooseSweden();
    fireEvent.click(screen.getByRole('button', { name: 'Hello.' }));
    await screen.findByText('Hej.');

    const listenButton = await screen.findByRole('button', { name: 'Listen: Swedish' });
    fireEvent.click(listenButton);

    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
    const utterance = /** @type {any} */ (speak.mock.calls[0]?.[0]);
    expect(utterance.text).toBe('Hej.');
    expect(utterance.lang).toBe('sv');
    expect(utterance.voice).toBe(voice);
  });
});
