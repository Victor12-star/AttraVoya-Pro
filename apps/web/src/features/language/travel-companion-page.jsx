'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Languages,
  LoaderCircle,
  Maximize2,
  MessageCircleMore,
  Mic,
  Send,
  Volume2,
  X,
} from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { getLanguagePageCopy } from '../destinations/language-page-copy.js';
import { getTravelCompanionCopy } from './travel-companion-copy.js';
import { getTravelCompanionInterpreterCopy } from './travel-companion-interpreter-copy.js';
import styles from './travel-companion-page.module.css';

const ENGLISH_LANGUAGE = Object.freeze({
  code: 'en',
  name: 'English',
  direction: 'ltr',
});

function textValue(value, maxLength = 3000) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function languageCode(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replaceAll('_', '-').toLowerCase();
  return normalized.length <= 10 && /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(normalized)
    ? normalized
    : null;
}

function browserWindow() {
  if (typeof window === 'undefined') return null;
  return /** @type {any} */ (window);
}

function speechRecognitionConstructor() {
  const currentWindow = browserWindow();
  return currentWindow?.SpeechRecognition ?? currentWindow?.webkitSpeechRecognition ?? null;
}

/** @param {any} response */
function normalizeCountries(response) {
  const rows = Array.isArray(response?.countries) ? response.countries : [];
  return rows
    .map((country) => {
      const iso2 = textValue(country?.iso2, 2)?.toUpperCase();
      const name = textValue(country?.name, 160);
      return iso2 && /^[A-Z]{2}$/.test(iso2) && name ? { iso2, name } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
}

/** @param {any} response */
function normalizePhrasebook(response) {
  const phrasebook = response?.phrasebook;
  if (languageCode(phrasebook?.sourceLanguage?.code) !== 'en') return null;

  const destinationLanguages = (
    Array.isArray(phrasebook?.destination?.languages) ? phrasebook.destination.languages : []
  )
    .map((language) => {
      const code = languageCode(language?.code);
      if (!code) return null;
      return {
        code,
        name: textValue(language?.name, 160) ?? code,
        nativeName: textValue(language?.nativeName, 160),
        direction: language?.direction === 'rtl' ? 'rtl' : 'ltr',
        available: language?.available === true,
      };
    })
    .filter(Boolean);

  const categories = (Array.isArray(phrasebook?.categories) ? phrasebook.categories : [])
    .map((category) => {
      const id = textValue(category?.id, 80);
      const name = textValue(category?.name, 160);
      const phrases = (Array.isArray(category?.phrases) ? category.phrases : [])
        .map((phrase) => {
          const phraseId = textValue(phrase?.id, 100);
          const text = textValue(phrase?.text, 3000);
          return phraseId && text ? { id: phraseId, text } : null;
        })
        .filter(Boolean);
      return id && name && phrases.length ? { id, name, phrases } : null;
    })
    .filter(Boolean);

  const preferredTargetLanguage = languageCode(phrasebook?.destination?.preferredTargetLanguage);
  const provider = textValue(phrasebook?.provider?.name, 80);

  return {
    countryCode: textValue(phrasebook?.destination?.countryCode, 2)?.toUpperCase() ?? null,
    countryName: textValue(phrasebook?.destination?.countryName, 160),
    destinationLanguages,
    preferredTargetLanguage,
    categories,
    provider,
  };
}

/**
 * @param {any} response
 * @param {string} expectedSource
 * @param {string} expectedTarget
 */
function normalizeTranslation(response, expectedSource, expectedTarget) {
  const translation = response?.translation;
  const source = languageCode(translation?.source);
  const target = languageCode(translation?.target);
  const translatedText = textValue(translation?.translatedText, 12_000);
  const provider = textValue(translation?.provider, 80);

  if (
    source !== expectedSource ||
    target !== expectedTarget ||
    !translatedText ||
    !provider
  ) {
    return null;
  }
  return { source, target, translatedText, provider };
}

function providerDisplayName(provider) {
  const normalized = String(provider ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'libretranslate') return 'LibreTranslate';
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '—';
}

/**
 * @param {object} props
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function TravelCompanionPage({ locale = 'en', messages }) {
  const languageCopy = getLanguagePageCopy(locale);
  const companionCopy = getTravelCompanionCopy(locale);
  const interpreterCopy = getTravelCompanionInterpreterCopy(locale);
  const recognitionRef = useRef(/** @type {any} */ (null));
  const showToLocalCloseRef = useRef(null);
  const historyIdRef = useRef(0);
  const [countriesState, setCountriesState] = useState(
    /** @type {any} */ ({ status: 'loading', data: [] }),
  );
  const [selectedCountry, setSelectedCountry] = useState('');
  const [phrasebookState, setPhrasebookState] = useState(
    /** @type {any} */ ({ status: 'idle', data: null }),
  );
  const [targetLanguage, setTargetLanguage] = useState('');
  const [translationDirection, setTranslationDirection] = useState('traveller-to-local');
  const [phrase, setPhrase] = useState('');
  const [translationStatus, setTranslationStatus] = useState('idle');
  const [history, setHistory] = useState(/** @type {any[]} */ ([]));
  const [showToLocalItem, setShowToLocalItem] = useState(/** @type {any} */ (null));
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [voiceOutputSupported, setVoiceOutputSupported] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle');

  useEffect(() => {
    let active = true;
    void apiClient
      .getCountries()
      .then((response) => {
        if (!active) return;
        const countries = normalizeCountries(response);
        setCountriesState({ status: countries.length ? 'success' : 'error', data: countries });
      })
      .catch(() => {
        if (active) setCountriesState({ status: 'error', data: [] });
      });

    const currentWindow = browserWindow();
    const capabilityTimer = currentWindow?.setTimeout?.(() => {
      if (!active) return;
      setVoiceInputSupported(typeof speechRecognitionConstructor() === 'function');
      setVoiceOutputSupported(
        Boolean(
          currentWindow?.speechSynthesis &&
          typeof currentWindow?.SpeechSynthesisUtterance === 'function',
        ),
      );
    }, 0);

    return () => {
      active = false;
      recognitionRef.current?.abort?.();
      currentWindow?.speechSynthesis?.cancel?.();
      if (capabilityTimer !== undefined) currentWindow?.clearTimeout?.(capabilityTimer);
    };
  }, []);

  useEffect(() => {
    if (!showToLocalItem) return undefined;

    const currentWindow = browserWindow();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowToLocalItem(null);
    };
    currentWindow?.addEventListener?.('keydown', handleKeyDown);
    const focusTimer = currentWindow?.setTimeout?.(() => showToLocalCloseRef.current?.focus(), 0);

    return () => {
      currentWindow?.removeEventListener?.('keydown', handleKeyDown);
      if (focusTimer !== undefined) currentWindow?.clearTimeout?.(focusTimer);
    };
  }, [showToLocalItem]);

  const phrasebook = phrasebookState.data;
  const availableDestinationLanguages = useMemo(
    () => phrasebook?.destinationLanguages.filter((language) => language.available) ?? [],
    [phrasebook],
  );
  const targetReference = availableDestinationLanguages.find(
    (language) => language.code === targetLanguage,
  );
  const quickPhrases = useMemo(
    () =>
      phrasebook?.categories.flatMap((category) =>
        category.phrases.map((item) => ({ ...item, categoryId: category.id })),
      ) ?? [],
    [phrasebook],
  );
  const travellerToLocal = translationDirection === 'traveller-to-local';
  const sourceReference = travellerToLocal ? ENGLISH_LANGUAGE : targetReference;
  const outputReference = travellerToLocal ? targetReference : ENGLISH_LANGUAGE;
  const sourceLanguage = sourceReference?.code ?? '';
  const outputLanguage = outputReference?.code ?? '';

  async function loadPhrasebook(countryCode) {
    setPhrasebookState({ status: 'loading', data: null });
    setTargetLanguage('');
    setTranslationDirection('traveller-to-local');
    setPhrase('');
    setHistory([]);
    setShowToLocalItem(null);
    setTranslationStatus('idle');
    setVoiceStatus('idle');

    try {
      const response = await apiClient.request(
        `/api/v1/phrasebook?countryCode=${encodeURIComponent(countryCode)}`,
        { cache: 'force-cache' },
      );
      const nextPhrasebook = normalizePhrasebook(response);
      if (!nextPhrasebook || nextPhrasebook.countryCode !== countryCode) {
        setPhrasebookState({ status: 'error', data: null });
        return;
      }

      setPhrasebookState({ status: 'success', data: nextPhrasebook });
      const preferred = nextPhrasebook.destinationLanguages.find(
        (language) =>
          language.available && language.code === nextPhrasebook.preferredTargetLanguage,
      );
      const firstAvailable = nextPhrasebook.destinationLanguages.find(
        (language) => language.available,
      );
      setTargetLanguage(preferred?.code ?? firstAvailable?.code ?? '');
    } catch {
      setPhrasebookState({ status: 'error', data: null });
    }
  }

  function handleCountryChange(event) {
    const countryCode = String(event.target.value ?? '')
      .trim()
      .toUpperCase();
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) return;
    setSelectedCountry(countryCode);
    if (countryCode) void loadPhrasebook(countryCode);
    else {
      setPhrasebookState({ status: 'idle', data: null });
      setTargetLanguage('');
      setTranslationDirection('traveller-to-local');
      setHistory([]);
      setShowToLocalItem(null);
      setPhrase('');
    }
  }

  function handleTargetChange(event) {
    const code = languageCode(event.target.value);
    if (!code || !availableDestinationLanguages.some((language) => language.code === code)) return;
    setTargetLanguage(code);
    setShowToLocalItem(null);
    setTranslationStatus('idle');
  }

  function toggleTranslationDirection() {
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    setTranslationDirection((current) =>
      current === 'traveller-to-local' ? 'local-to-traveller' : 'traveller-to-local',
    );
    setPhrase('');
    setShowToLocalItem(null);
    setTranslationStatus('idle');
    setVoiceStatus('idle');
  }

  async function performTranslation(sourceText) {
    const normalizedText = textValue(sourceText, 3000);
    if (
      !normalizedText ||
      !sourceLanguage ||
      !outputLanguage ||
      !targetLanguage ||
      !availableDestinationLanguages.some((language) => language.code === targetLanguage)
    ) {
      setTranslationStatus('invalid');
      return;
    }

    setTranslationStatus('loading');
    try {
      const response = await apiClient.translateText({
        text: normalizedText,
        source: sourceLanguage,
        target: outputLanguage,
      });
      const translation = normalizeTranslation(response, sourceLanguage, outputLanguage);
      if (!translation) {
        setTranslationStatus('error');
        return;
      }

      historyIdRef.current += 1;
      setHistory((current) => [
        ...current.slice(-23),
        {
          id: historyIdRef.current,
          sourceText: normalizedText,
          translatedText: translation.translatedText,
          source: translation.source,
          target: translation.target,
          provider: translation.provider,
        },
      ]);
      setTranslationStatus('success');
    } catch {
      setTranslationStatus('error');
    }
  }

  function translate(event) {
    event.preventDefault();
    void performTranslation(phrase);
  }

  function handleQuickPhrase(value) {
    if (!travellerToLocal) return;
    setPhrase(value);
    void performTranslation(value);
  }

  function startVoiceInput() {
    const Recognition = speechRecognitionConstructor();
    if (typeof Recognition !== 'function' || !sourceLanguage) return;

    recognitionRef.current?.abort?.();
    const recognition = new Recognition();
    recognition.lang = sourceLanguage;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = textValue(event?.results?.[0]?.[0]?.transcript, 3000);
      if (!transcript) return;
      setPhrase(transcript);
      void performTranslation(transcript);
    };
    recognition.onerror = () => setVoiceStatus('error');
    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceStatus((current) => (current === 'error' ? current : 'idle'));
    };

    recognitionRef.current = recognition;
    setVoiceStatus('listening');
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceStatus('error');
    }
  }

  function speakTranslation(text, target) {
    const currentWindow = browserWindow();
    if (
      !currentWindow?.speechSynthesis ||
      typeof currentWindow?.SpeechSynthesisUtterance !== 'function'
    ) {
      return;
    }

    currentWindow.speechSynthesis.cancel();
    const utterance = new currentWindow.SpeechSynthesisUtterance(text);
    utterance.lang = target;
    const matchingVoice = currentWindow.speechSynthesis
      .getVoices()
      .find((voice) => String(voice.lang).toLowerCase().startsWith(target.toLowerCase()));
    if (matchingVoice) utterance.voice = matchingVoice;
    currentWindow.speechSynthesis.speak(utterance);
  }

  return (
    <section className={styles.page} aria-labelledby="travel-companion-title">
      <div className={`shell ${styles.shell}`}>
        <header className={styles.hero}>
          <span className={styles.heroIcon} aria-hidden="true">
            <Languages size={28} />
          </span>
          <div>
            <span className="eyebrow">{languageCopy.eyebrow}</span>
            <h1 id="travel-companion-title">{companionCopy.title}</h1>
            <p>{languageCopy.translatorIntro}</p>
          </div>
        </header>

        <section className={styles.setup} aria-label={messages.common.chooseCountry}>
          <label className={styles.field}>
            <span>{messages.common.chooseCountry}</span>
            <select
              value={selectedCountry}
              onChange={handleCountryChange}
              disabled={countriesState.status === 'loading'}
            >
              <option value="">{messages.common.chooseCountry}</option>
              {countriesState.data.map((country) => (
                <option key={country.iso2} value={country.iso2}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          {phrasebookState.status === 'success' && availableDestinationLanguages.length ? (
            <label className={styles.field}>
              <span>{languageCopy.targetLanguage}</span>
              <select value={targetLanguage} onChange={handleTargetChange}>
                {availableDestinationLanguages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                    {language.nativeName && language.nativeName !== language.name
                      ? ` · ${language.nativeName}`
                      : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </section>

        {countriesState.status === 'loading' || phrasebookState.status === 'loading' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {countriesState.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <span>{languageCopy.referenceUnavailable}</span>
          </div>
        ) : null}

        {phrasebookState.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <span>{languageCopy.supportUnavailable}</span>
          </div>
        ) : null}

        {phrasebookState.status === 'success' && availableDestinationLanguages.length === 0 ? (
          <div className={styles.feedback} role="status">
            <span>{languageCopy.unsupported}</span>
          </div>
        ) : null}

        {phrasebookState.status === 'success' && availableDestinationLanguages.length ? (
          <div className={styles.workspace}>
            <section className={styles.interpreterPanel} aria-labelledby="interpreter-title">
              <div>
                <span className="eyebrow">{phrasebook?.countryName ?? selectedCountry}</span>
                <h2 id="interpreter-title">{interpreterCopy.interpreter}</h2>
                <p>{interpreterCopy.directionHint}</p>
              </div>
              <button
                className={`button button--secondary ${styles.directionButton}`}
                type="button"
                onClick={toggleTranslationDirection}
                aria-label={interpreterCopy.swapDirection}
                title={interpreterCopy.swapDirection}
              >
                <ArrowRightLeft size={17} aria-hidden="true" />
                <span>{sourceReference?.name ?? sourceLanguage}</span>
                <span aria-hidden="true">→</span>
                <span>{outputReference?.name ?? outputLanguage}</span>
              </button>
            </section>

            {travellerToLocal ? (
              <section className={styles.quickPanel} aria-labelledby="quick-phrases-title">
                <div className={styles.sectionHeading}>
                  <div>
                    <span className="eyebrow">English</span>
                    <h2 id="quick-phrases-title">{companionCopy.quickPhrases}</h2>
                  </div>
                  <span className={styles.destinationBadge}>
                    {phrasebook?.countryName ?? selectedCountry}
                  </span>
                </div>
                <div className={styles.quickPhrases}>
                  {quickPhrases.map((item) => (
                    <button
                      className={styles.quickPhrase}
                      key={`${item.categoryId}-${item.id}`}
                      type="button"
                      disabled={translationStatus === 'loading'}
                      onClick={() => handleQuickPhrase(item.text)}
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <form className={styles.composer} onSubmit={translate}>
              <div className={styles.composerDirection}>
                <strong>{sourceReference?.name ?? sourceLanguage}</strong>
                <span aria-hidden="true">→</span>
                <strong>{outputReference?.name ?? outputLanguage}</strong>
              </div>
              <label className={styles.field}>
                <span>{languageCopy.phrase}</span>
                <textarea
                  dir={sourceReference?.direction ?? 'ltr'}
                  maxLength={3000}
                  placeholder={languageCopy.placeholder}
                  rows={4}
                  value={phrase}
                  onChange={(event) => {
                    setPhrase(event.target.value);
                    setTranslationStatus('idle');
                    if (voiceStatus === 'error') setVoiceStatus('idle');
                  }}
                />
              </label>

              <div className={styles.actions}>
                {voiceInputSupported ? (
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={voiceStatus === 'listening' || translationStatus === 'loading'}
                    onClick={startVoiceInput}
                    aria-label={`${interpreterCopy.speak}: ${sourceReference?.name ?? sourceLanguage}`}
                    title={`${interpreterCopy.speak}: ${sourceReference?.name ?? sourceLanguage}`}
                  >
                    {voiceStatus === 'listening' ? (
                      <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
                    ) : (
                      <Mic size={17} aria-hidden="true" />
                    )}
                    {voiceStatus === 'listening'
                      ? companionCopy.listening
                      : `${interpreterCopy.speak} · ${sourceReference?.name ?? sourceLanguage}`}
                  </button>
                ) : null}

                <button
                  className="button button--accent"
                  type="submit"
                  disabled={translationStatus === 'loading'}
                >
                  {translationStatus === 'loading' ? (
                    <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
                  ) : (
                    <Send size={17} aria-hidden="true" />
                  )}
                  {languageCopy.translate}
                </button>
              </div>

              {voiceStatus === 'error' ? (
                <p className={styles.inlineError} role="alert">
                  {companionCopy.voiceUnavailable}
                </p>
              ) : null}
              {translationStatus === 'invalid' ? (
                <p className={styles.inlineError} role="alert">
                  {languageCopy.invalidText}
                </p>
              ) : null}
              {translationStatus === 'error' ? (
                <p className={styles.inlineError} role="alert">
                  {languageCopy.translationUnavailable}
                </p>
              ) : null}
            </form>

            <section className={styles.conversation} aria-labelledby="conversation-title">
              <div className={styles.sectionHeading}>
                <div>
                  <span className="eyebrow">{targetReference?.name ?? targetLanguage}</span>
                  <h2 id="conversation-title">{companionCopy.conversation}</h2>
                </div>
                {history.length ? (
                  <button
                    className="button button--secondary button--compact"
                    type="button"
                    onClick={() => {
                      setHistory([]);
                      setShowToLocalItem(null);
                    }}
                  >
                    {messages.common.clear}
                  </button>
                ) : null}
              </div>

              {history.length === 0 ? (
                <div className={styles.emptyConversation} role="status">
                  <MessageCircleMore size={25} aria-hidden="true" />
                  <span>{companionCopy.emptyConversation}</span>
                </div>
              ) : (
                <div className={styles.messages} aria-live="polite">
                  {history.map((item) => {
                    const localReference = availableDestinationLanguages.find(
                      (language) => language.code === item.source || language.code === item.target,
                    );
                    const itemSourceReference =
                      item.source === 'en' ? ENGLISH_LANGUAGE : localReference;
                    const itemTargetReference =
                      item.target === 'en' ? ENGLISH_LANGUAGE : localReference;
                    return (
                      <article className={styles.exchange} key={item.id}>
                        <div
                          className={`${styles.bubble} ${styles.sourceBubble}`}
                          dir={itemSourceReference?.direction ?? 'ltr'}
                        >
                          <span>{itemSourceReference?.name ?? item.source}</span>
                          <p>{item.sourceText}</p>
                        </div>
                        <div
                          className={`${styles.bubble} ${styles.translationBubble}`}
                          dir={itemTargetReference?.direction ?? 'ltr'}
                        >
                          <span>{itemTargetReference?.name ?? item.target}</span>
                          <p>{item.translatedText}</p>
                          <div className={styles.translationMeta}>
                            <small dir="ltr">{providerDisplayName(item.provider)}</small>
                            <div className={styles.translationActions}>
                              {voiceOutputSupported ? (
                                <button
                                  className={styles.listenButton}
                                  type="button"
                                  onClick={() => speakTranslation(item.translatedText, item.target)}
                                  aria-label={`${companionCopy.listen}: ${itemTargetReference?.name ?? item.target}`}
                                >
                                  <Volume2 size={16} aria-hidden="true" />
                                  {companionCopy.listen}
                                </button>
                              ) : null}
                              {item.target !== 'en' ? (
                                <button
                                  className={styles.listenButton}
                                  type="button"
                                  onClick={() => setShowToLocalItem(item)}
                                  aria-label={interpreterCopy.showToLocal}
                                >
                                  <Maximize2 size={16} aria-hidden="true" />
                                  {interpreterCopy.showToLocal}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className={styles.privacyNote}>
              <MessageCircleMore size={21} aria-hidden="true" />
              <div>
                <strong>{languageCopy.machineTranslation}</strong>
                <p>{languageCopy.privacy}</p>
                <p>{companionCopy.sessionOnly}</p>
                {phrasebook?.provider ? (
                  <small>{providerDisplayName(phrasebook.provider)}</small>
                ) : null}
              </div>
            </aside>
          </div>
        ) : null}
      </div>

      {showToLocalItem ? (
        <div
          className={styles.showLocalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowToLocalItem(null);
          }}
        >
          <section
            className={styles.showLocalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="show-local-title"
          >
            <header className={styles.showLocalHeader}>
              <div>
                <span className="eyebrow">{phrasebook?.countryName ?? selectedCountry}</span>
                <h2 id="show-local-title">{interpreterCopy.showToLocal}</h2>
              </div>
              <button
                ref={showToLocalCloseRef}
                className={styles.showLocalClose}
                type="button"
                onClick={() => setShowToLocalItem(null)}
                aria-label={interpreterCopy.close}
              >
                <X size={24} aria-hidden="true" />
              </button>
            </header>
            <p className={styles.showLocalText} dir={targetReference?.direction ?? 'ltr'}>
              {showToLocalItem.translatedText}
            </p>
            <footer className={styles.showLocalFooter}>
              <strong>{targetReference?.name ?? showToLocalItem.target}</strong>
              <span>{interpreterCopy.showToLocalHint}</span>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
