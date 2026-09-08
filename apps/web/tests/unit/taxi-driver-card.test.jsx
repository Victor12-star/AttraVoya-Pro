import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  autocompletePlaces: vi.fn(),
  translateText: vi.fn(),
  safeRideProps: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    autocompletePlaces: mocks.autocompletePlaces,
    translateText: mocks.translateText,
  },
}));

vi.mock('../../src/features/safety/safe-ride-route-watch.jsx', () => ({
  SafeRideRouteWatch: (props) => {
    mocks.safeRideProps(props);
    return <div data-testid="safe-ride-watch">Safe Ride</div>;
  },
}));

const { TaxiDriverCard } = await import('../../src/features/language/taxi-driver-card.jsx');

function validPlace(overrides = {}) {
  return {
    externalId: 'place-1',
    name: 'Grand Hotel Stockholm',
    formattedAddress: 'Södra Blasieholmshamnen 8, Stockholm',
    countryCode: 'SE',
    latitude: 59.3294,
    longitude: 18.075,
    ...overrides,
  };
}

async function searchAndSelect() {
  fireEvent.change(screen.getByLabelText('Where do you want to go?'), {
    target: { value: 'Grand Hotel' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find place' }));
  const result = await screen.findByRole('button', { name: /Grand Hotel Stockholm/i });
  fireEvent.click(result);
}

describe('TaxiDriverCard', () => {
  beforeEach(() => {
    mocks.autocompletePlaces.mockReset();
    mocks.translateText.mockReset();
    mocks.safeRideProps.mockReset();
    mocks.autocompletePlaces.mockResolvedValue({ places: { results: [validPlace()] } });
    mocks.translateText.mockResolvedValue({
      translation: {
        provider: 'libretranslate',
        source: 'en',
        target: 'sv',
        translatedText:
          'Ta mig till Grand Hotel Stockholm. Adressen är Södra Blasieholmshamnen 8, Stockholm.',
      },
    });
  });

  it('uses a provider-backed destination and creates a destination-language driver card', async () => {
    render(
      <TaxiDriverCard
        countryCode="SE"
        targetLanguage="sv"
        targetLanguageName="Swedish"
        locale="en"
      />,
    );

    await searchAndSelect();
    fireEvent.click(screen.getByRole('button', { name: 'Create driver card' }));

    const dialog = await screen.findByRole('dialog', { name: 'Taxi / Driver Card' });
    expect(mocks.autocompletePlaces).toHaveBeenCalledWith({
      query: 'Grand Hotel',
      limit: 6,
      language: 'en',
      countryCode: 'SE',
    });
    expect(mocks.translateText).toHaveBeenCalledWith({
      text: 'Please take me to Grand Hotel Stockholm. The address is Södra Blasieholmshamnen 8, Stockholm.',
      source: 'en',
      target: 'sv',
    });
    expect(dialog).toHaveTextContent('Grand Hotel Stockholm');
    expect(dialog).toHaveTextContent('Södra Blasieholmshamnen 8, Stockholm');
    expect(dialog).toHaveTextContent('Ta mig till Grand Hotel Stockholm.');
  });

  it('rejects wrong-country and invalid-coordinate search results', async () => {
    mocks.autocompletePlaces.mockResolvedValue({
      places: {
        results: [
          validPlace({ externalId: 'wrong-country', countryCode: 'NO', name: 'Wrong country' }),
          validPlace({ externalId: 'bad-lat', latitude: 120, name: 'Bad latitude' }),
          validPlace(),
        ],
      },
    });

    render(
      <TaxiDriverCard
        countryCode="SE"
        targetLanguage="sv"
        targetLanguageName="Swedish"
        locale="en"
      />,
    );
    fireEvent.change(screen.getByLabelText('Where do you want to go?'), {
      target: { value: 'hotel' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Find place' }));

    expect(
      await screen.findByRole('button', { name: /Grand Hotel Stockholm/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong country')).not.toBeInTheDocument();
    expect(screen.queryByText('Bad latitude')).not.toBeInTheDocument();
  });

  it('rejects a translation returned for the wrong language contract', async () => {
    mocks.translateText.mockResolvedValue({
      translation: {
        provider: 'libretranslate',
        source: 'en',
        target: 'de',
        translatedText: 'Erfundener falscher Vertrag.',
      },
    });

    render(
      <TaxiDriverCard
        countryCode="SE"
        targetLanguage="sv"
        targetLanguageName="Swedish"
        locale="en"
      />,
    );
    await searchAndSelect();
    fireEvent.click(screen.getByRole('button', { name: 'Create driver card' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The driver instruction could not be translated. No translation was invented.',
    );
    expect(screen.queryByText('Erfundener falscher Vertrag.')).not.toBeInTheDocument();
  });

  it('passes only a selected provider place into Safe Ride when the Google deployment gate is configured', async () => {
    render(
      <TaxiDriverCard
        countryCode="SE"
        targetLanguage="sv"
        targetLanguageName="Swedish"
        locale="en"
        googleMapsBrowserKey="restricted-browser-key"
        safeRideGoogleEnabled
      />,
    );
    expect(screen.queryByTestId('safe-ride-watch')).not.toBeInTheDocument();

    await searchAndSelect();

    expect(await screen.findByTestId('safe-ride-watch')).toBeInTheDocument();
    expect(mocks.safeRideProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        destination: {
          name: 'Grand Hotel Stockholm',
          latitude: 59.3294,
          longitude: 18.075,
        },
        locale: 'en',
        googleMapsBrowserKey: 'restricted-browser-key',
        enabled: true,
      }),
    );
  });

  it('marks the translated driver instruction as RTL for an RTL destination language', async () => {
    mocks.translateText.mockResolvedValue({
      translation: {
        provider: 'libretranslate',
        source: 'en',
        target: 'ar',
        translatedText: 'من فضلك خذني إلى هذا الفندق.',
      },
    });

    render(
      <TaxiDriverCard
        countryCode="AE"
        targetLanguage="ar"
        targetLanguageName="Arabic"
        targetDirection="rtl"
        locale="en"
      />,
    );
    mocks.autocompletePlaces.mockResolvedValue({
      places: {
        results: [
          validPlace({ countryCode: 'AE', name: 'Dubai Hotel', formattedAddress: 'Dubai' }),
        ],
      },
    });
    fireEvent.change(screen.getByLabelText('Where do you want to go?'), {
      target: { value: 'Dubai Hotel' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Find place' }));
    fireEvent.click(await screen.findByRole('button', { name: /Dubai Hotel/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Create driver card' }));

    const translated = await screen.findByText('من فضلك خذني إلى هذا الفندق.');
    expect(translated).toHaveAttribute('dir', 'rtl');
  });
});
