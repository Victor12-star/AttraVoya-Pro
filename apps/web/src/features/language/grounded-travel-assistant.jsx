'use client';

import { useRef, useState } from 'react';
import {
  ExternalLink,
  LoaderCircle,
  MessageCircleQuestion,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { getGroundedTravelAssistantCopy } from './grounded-travel-assistant-copy.js';
import styles from './grounded-travel-assistant.module.css';

const MAX_QUESTION_LENGTH = 600;
const MAX_HISTORY_ITEMS = 10;

const INTENT_TERMS = Object.freeze({
  consular: [
    'embassy',
    'consulate',
    'passport',
    'ambassad',
    'konsulat',
    'pasaporte',
    'embajada',
    'consulado',
    'passeport',
    'ambassade',
    'consulat',
    'reisepass',
    'botschaft',
    'konsulat',
    'passaporto',
    'ambasciata',
    'consolato',
    'passaporte',
    'embaixada',
    'consulado',
    'paszport',
    'ambasada',
    'konsulat',
    'paspoort',
    'ambassade',
    'consulaat',
    'passi',
    'suurlähetyst',
    'konsulaat',
    'pasaport',
    'büyükelçilik',
    'konsolosluk',
    'سفارة',
    'قنصلية',
    'جواز',
    '使馆',
    '领事馆',
    '护照',
    '大使館',
    '領事館',
    'パスポート',
    '대사관',
    '영사관',
    '여권',
    'दूतावास',
    'वाणिज्य दूतावास',
    'पासपोर्ट',
  ],
  emergency: [
    'emergency',
    'police',
    'ambulance',
    'fire service',
    'nöd',
    'akut',
    'polis',
    'ambulans',
    'emergencia',
    'policía',
    'ambulancia',
    'urgencia',
    'police',
    'ambulance',
    'urgence',
    'notfall',
    'polizei',
    'krankenwagen',
    'emergenza',
    'polizia',
    'ambulanza',
    'emergência',
    'polícia',
    'ambulância',
    'nagły',
    'policja',
    'pogotowie',
    'nood',
    'politie',
    'ambulance',
    'nøds',
    'politi',
    'ambulanse',
    'nød',
    'politi',
    'ambulance',
    'hätä',
    'poliisi',
    'ambulanssi',
    'acil',
    'polis',
    'ambulans',
    'طوارئ',
    'شرطة',
    'إسعاف',
    '紧急',
    '警察',
    '救护车',
    '緊急',
    '警察',
    '救急車',
    '응급',
    '경찰',
    '구급차',
    'आपात',
    'पुलिस',
    'एम्बुलेंस',
  ],
  language: [
    'language',
    'speak',
    'språk',
    'tala',
    'idioma',
    'hablar',
    'langue',
    'parler',
    'sprache',
    'sprechen',
    'lingua',
    'parlare',
    'falar',
    'język',
    'mówić',
    'taal',
    'spreken',
    'snakke',
    'sprog',
    'tale',
    'kieli',
    'puhua',
    'dil',
    'konuş',
    'لغة',
    'أتحدث',
    '语言',
    '说',
    '言語',
    '話',
    '언어',
    '말',
    'भाषा',
    'बोल',
  ],
  phrases: [
    'phrase',
    'how do i say',
    'hello',
    'thank you',
    'fras',
    'hur säger',
    'frase',
    'cómo digo',
    'dire',
    'comment dire',
    'satz',
    'wie sage',
    'come si dice',
    'como digo',
    'zwrot',
    'jak powiedzieć',
    'zin',
    'hoe zeg',
    'hvordan sier',
    'sætning',
    'hvordan siger',
    'fraasi',
    'miten sanon',
    'ifade',
    'nasıl söylerim',
    'عبارة',
    'كيف أقول',
    '短语',
    '怎么说',
    'フレーズ',
    'どう言',
    '문구',
    '어떻게 말',
    'वाक्य',
    'कैसे कह',
  ],
});

function safeText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function normalizedSearchText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim();
}

function containsAny(value, terms) {
  const normalized = normalizedSearchText(value);
  return terms.some((term) => normalized.includes(normalizedSearchText(term)));
}

export function classifyGroundedTravelQuestion(question) {
  if (containsAny(question, INTENT_TERMS.consular)) return 'consular';
  if (containsAny(question, INTENT_TERMS.emergency)) return 'emergency';
  if (containsAny(question, INTENT_TERMS.language)) return 'language';
  if (containsAny(question, INTENT_TERMS.phrases)) return 'phrases';
  return 'unsupported';
}

/** @param {any} response */
function normalizeCountries(response) {
  const countries = Array.isArray(response?.countries) ? response.countries : [];
  return countries
    .map((country) => {
      const iso2 = safeText(country?.iso2, 2)?.toUpperCase();
      const name = safeText(country?.name, 160);
      return iso2 && /^[A-Z]{2}$/.test(iso2) && name ? { iso2, name } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
}

function safeLanguageCode(value) {
  const normalized = safeText(value, 10)?.replaceAll('_', '-').toLowerCase();
  return normalized && /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(normalized) ? normalized : null;
}

/** @param {any} response @param {string} expectedCountryCode */
export function normalizeAssistantPhrasebook(response, expectedCountryCode) {
  const phrasebook = response?.phrasebook;
  const countryCode = safeText(phrasebook?.destination?.countryCode, 2)?.toUpperCase();
  const countryName = safeText(phrasebook?.destination?.countryName, 160);
  if (countryCode !== expectedCountryCode || !countryName) return null;

  const languages = (Array.isArray(phrasebook?.destination?.languages)
    ? phrasebook.destination.languages
    : []
  )
    .map((language) => {
      const code = safeLanguageCode(language?.code);
      const name = safeText(language?.name, 160);
      const nativeName = safeText(language?.nativeName, 160);
      return code && name && language?.available === true ? { code, name, nativeName } : null;
    })
    .filter(Boolean);

  const phrases = (Array.isArray(phrasebook?.categories) ? phrasebook.categories : [])
    .flatMap((category) => (Array.isArray(category?.phrases) ? category.phrases : []))
    .map((phrase) => safeText(phrase?.text, 3000))
    .filter(Boolean)
    .slice(0, 8);

  return {
    countryCode,
    countryName,
    languages,
    phrases,
    provider: safeText(phrasebook?.provider?.name, 80),
  };
}

function safeHttpUrl(value) {
  const candidate = safeText(value, 1000);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeIsoTimestamp(value) {
  const candidate = safeText(value, 80);
  if (!candidate) return null;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** @param {any} response @param {string} expectedCountryCode */
export function normalizeAssistantEmergency(response, expectedCountryCode) {
  const emergency = response?.emergency;
  const countryCode = safeText(emergency?.countryCode, 2)?.toUpperCase();
  if (countryCode !== expectedCountryCode) return null;

  const records = (Array.isArray(emergency?.records) ? emergency.records : [])
    .map((record) => {
      const id = safeText(record?.id, 128);
      const serviceLabel = safeText(record?.serviceLabel, 160);
      const phoneNumber = safeText(record?.phoneNumber, 80);
      const sourceName = safeText(record?.sourceName, 240);
      const sourceUrl = safeHttpUrl(record?.sourceUrl);
      const lastVerifiedAt = safeIsoTimestamp(record?.lastVerifiedAt);
      return id && serviceLabel && phoneNumber && sourceName && sourceUrl && lastVerifiedAt
        ? { id, serviceLabel, phoneNumber, sourceName, sourceUrl, lastVerifiedAt }
        : null;
    })
    .filter(Boolean);

  return { countryCode, records };
}

function providerDisplayName(provider) {
  const normalized = String(provider ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'libretranslate') return 'LibreTranslate';
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : null;
}

function languageDisplayName(language) {
  if (!language?.nativeName || language.nativeName === language.name) return language?.name ?? '';
  return `${language.name} (${language.nativeName})`;
}

/**
 * @param {object} props
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function GroundedTravelAssistant({ locale = 'en', messages }) {
  const copy = getGroundedTravelAssistantCopy(locale);
  const countryRequestRef = useRef(0);
  const answerRequestRef = useRef(0);
  const historyIdRef = useRef(0);
  const [countriesState, setCountriesState] = useState(
    /** @type {{status:string, data:any[]}} */ ({ status: 'idle', data: [] }),
  );
  const [countryCode, setCountryCode] = useState('');
  const [phrasebookState, setPhrasebookState] = useState(
    /** @type {{status:string, data:any}} */ ({ status: 'idle', data: null }),
  );
  const [question, setQuestion] = useState('');
  const [answerStatus, setAnswerStatus] = useState('idle');
  const [history, setHistory] = useState(/** @type {any[]} */ ([]));

  async function loadCountries() {
    if (countriesState.status === 'loading' || countriesState.status === 'success') return;
    setCountriesState({ status: 'loading', data: [] });
    try {
      const response = await apiClient.getCountries();
      const countries = normalizeCountries(response);
      setCountriesState({ status: countries.length ? 'success' : 'error', data: countries });
    } catch {
      setCountriesState({ status: 'error', data: [] });
    }
  }

  if (countriesState.status === 'idle') void loadCountries();

  async function loadPhrasebook(nextCountryCode) {
    countryRequestRef.current += 1;
    const requestId = countryRequestRef.current;
    setPhrasebookState({ status: 'loading', data: null });
    try {
      const response = await apiClient.request(
        `/api/v1/phrasebook?countryCode=${encodeURIComponent(nextCountryCode)}`,
        { cache: 'force-cache' },
      );
      if (requestId !== countryRequestRef.current) return;
      const phrasebook = normalizeAssistantPhrasebook(response, nextCountryCode);
      setPhrasebookState({ status: phrasebook ? 'success' : 'error', data: phrasebook });
    } catch {
      if (requestId === countryRequestRef.current) {
        setPhrasebookState({ status: 'error', data: null });
      }
    }
  }

  function handleCountryChange(event) {
    const nextCountryCode = String(event.target.value ?? '')
      .trim()
      .toUpperCase();
    if (nextCountryCode && !/^[A-Z]{2}$/.test(nextCountryCode)) return;

    countryRequestRef.current += 1;
    answerRequestRef.current += 1;
    setCountryCode(nextCountryCode);
    setHistory([]);
    setQuestion('');
    setAnswerStatus('idle');
    if (nextCountryCode) void loadPhrasebook(nextCountryCode);
    else setPhrasebookState({ status: 'idle', data: null });
  }

  function pushAnswer(item) {
    historyIdRef.current += 1;
    setHistory((current) => [
      ...current.slice(-(MAX_HISTORY_ITEMS - 1)),
      { id: historyIdRef.current, ...item },
    ]);
  }

  function destinationName() {
    return (
      phrasebookState.data?.countryName ??
      countriesState.data.find((country) => country.iso2 === countryCode)?.name ??
      countryCode
    );
  }

  async function answerQuestion(rawQuestion, forcedIntent = null) {
    const normalizedQuestion = safeText(rawQuestion, MAX_QUESTION_LENGTH);
    if (!normalizedQuestion) return;

    const intent = forcedIntent ?? classifyGroundedTravelQuestion(normalizedQuestion);
    const currentCountryCode = countryCode;
    const currentCountryName = destinationName();
    answerRequestRef.current += 1;
    const requestId = answerRequestRef.current;
    setAnswerStatus('loading');

    if (!currentCountryCode) {
      pushAnswer({ question: normalizedQuestion, text: copy.selectDestination, grounded: false });
      setAnswerStatus('idle');
      setQuestion('');
      return;
    }

    if (intent === 'consular') {
      pushAnswer({
        question: normalizedQuestion,
        text: copy.consularAnswer,
        grounded: true,
        action: 'emergency',
        sources: [{ label: 'AttraVoya Travel Emergency Mode' }],
      });
      setAnswerStatus('idle');
      setQuestion('');
      return;
    }

    if (intent === 'emergency') {
      try {
        const response = await apiClient.request(
          `/api/v1/emergency?countryCode=${encodeURIComponent(currentCountryCode)}`,
          { cache: 'no-store' },
        );
        if (requestId !== answerRequestRef.current || currentCountryCode !== countryCode) return;
        const emergency = normalizeAssistantEmergency(response, currentCountryCode);
        if (!emergency) {
          pushAnswer({
            question: normalizedQuestion,
            text: copy.referenceUnavailable,
            grounded: false,
          });
        } else if (emergency.records.length === 0) {
          pushAnswer({
            question: normalizedQuestion,
            text: copy.emergencyUnavailable,
            grounded: true,
            action: 'emergency',
            sources: [{ label: copy.emergencySource }],
          });
        } else {
          pushAnswer({
            question: normalizedQuestion,
            text: copy.emergencyAnswer(currentCountryName),
            grounded: true,
            records: emergency.records,
            sources: emergency.records.map((record) => ({
              label: record.sourceName,
              url: record.sourceUrl,
              verifiedAt: record.lastVerifiedAt,
            })),
          });
        }
      } catch {
        if (requestId === answerRequestRef.current && currentCountryCode === countryCode) {
          pushAnswer({
            question: normalizedQuestion,
            text: copy.referenceUnavailable,
            grounded: false,
          });
        }
      } finally {
        if (requestId === answerRequestRef.current) setAnswerStatus('idle');
        if (currentCountryCode === countryCode) setQuestion('');
      }
      return;
    }

    if (intent === 'unsupported') {
      pushAnswer({ question: normalizedQuestion, text: copy.unsupported, grounded: false });
      setAnswerStatus('idle');
      setQuestion('');
      return;
    }

    const phrasebook = phrasebookState.data;
    if (phrasebookState.status === 'loading') {
      pushAnswer({ question: normalizedQuestion, text: copy.loadingReference, grounded: false });
      setAnswerStatus('idle');
      setQuestion('');
      return;
    }
    if (
      phrasebookState.status !== 'success' ||
      !phrasebook ||
      phrasebook.countryCode !== currentCountryCode
    ) {
      pushAnswer({ question: normalizedQuestion, text: copy.referenceUnavailable, grounded: false });
      setAnswerStatus('idle');
      setQuestion('');
      return;
    }

    const source = {
      label: copy.phrasebookSource,
      detail: providerDisplayName(phrasebook.provider),
    };

    if (intent === 'language') {
      const languageNames = phrasebook.languages.map(languageDisplayName).filter(Boolean);
      pushAnswer({
        question: normalizedQuestion,
        text: languageNames.length
          ? copy.languageAnswer(phrasebook.countryName, languageNames)
          : copy.referenceUnavailable,
        grounded: languageNames.length > 0,
        sources: languageNames.length ? [source] : [],
      });
    } else {
      const phrases = phrasebook.phrases.slice(0, 4);
      pushAnswer({
        question: normalizedQuestion,
        text: phrases.length ? copy.phraseAnswer(phrasebook.countryName) : copy.referenceUnavailable,
        grounded: phrases.length > 0,
        phrases,
        sources: phrases.length ? [source] : [],
      });
    }

    setAnswerStatus('idle');
    setQuestion('');
  }

  function submitQuestion(event) {
    event.preventDefault();
    void answerQuestion(question);
  }

  function openEmergencyMode() {
    const heading = document.getElementById('travel-emergency-title');
    heading?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  const promptButtons = [
    ['language', copy.languagePrompt],
    ['phrases', copy.phrasePrompt],
    ['emergency', copy.emergencyPrompt],
    ['consular', copy.passportPrompt],
  ];

  return (
    <section className={`shell ${styles.section}`} aria-labelledby="grounded-assistant-title">
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <MessageCircleQuestion size={28} />
        </span>
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2 id="grounded-assistant-title">{copy.title}</h2>
          <p>{copy.intro}</p>
        </div>
        <span className={styles.trustBadge}>
          <ShieldCheck size={16} aria-hidden="true" />
          {copy.trustedOnly}
        </span>
      </header>

      <div className={styles.setup}>
        <label className={styles.field}>
          <span>{copy.destination}</span>
          <select
            value={countryCode}
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
        <p>{copy.destinationHint}</p>
      </div>

      {countriesState.status === 'loading' ? (
        <div className={styles.feedback} role="status" aria-live="polite">
          <LoaderCircle className={styles.spin} size={20} aria-hidden="true" />
          {messages.common.loading}
        </div>
      ) : null}
      {countriesState.status === 'error' ? (
        <div className={styles.feedback} role="alert">
          {copy.referenceUnavailable}
        </div>
      ) : null}

      <div className={styles.prompts} aria-label={copy.eyebrow}>
        {promptButtons.map(([intent, label]) => (
          <button
            className={styles.promptButton}
            type="button"
            key={intent}
            disabled={answerStatus === 'loading'}
            onClick={() => void answerQuestion(label, intent)}
          >
            {label}
          </button>
        ))}
      </div>

      <form className={styles.composer} onSubmit={submitQuestion}>
        <label className={styles.field}>
          <span className={styles.srOnly}>{copy.placeholder}</span>
          <textarea
            rows={3}
            maxLength={MAX_QUESTION_LENGTH}
            value={question}
            placeholder={copy.placeholder}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </label>
        <button
          className="button button--accent"
          type="submit"
          disabled={answerStatus === 'loading' || !question.trim()}
        >
          {answerStatus === 'loading' ? (
            <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
          ) : (
            <Send size={17} aria-hidden="true" />
          )}
          {copy.ask}
        </button>
      </form>

      <section className={styles.conversation} aria-label={copy.eyebrow}>
        <div className={styles.conversationHeader}>
          <p>{copy.sessionOnly}</p>
          {history.length ? (
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={() => setHistory([])}
            >
              <Trash2 size={15} aria-hidden="true" />
              {copy.clear}
            </button>
          ) : null}
        </div>

        {history.length === 0 ? (
          <div className={styles.empty} role="status">
            <MessageCircleQuestion size={22} aria-hidden="true" />
            <span>{copy.empty}</span>
          </div>
        ) : (
          <div className={styles.history} aria-live="polite">
            {history.map((item) => (
              <article className={styles.exchange} key={item.id}>
                <div className={styles.userBubble}>
                  <strong>{item.question}</strong>
                </div>
                <div className={styles.answerBubble}>
                  <div className={styles.answerHeading}>
                    <ShieldCheck size={17} aria-hidden="true" />
                    <span>{item.grounded ? copy.trustedOnly : copy.noModel}</span>
                  </div>
                  <p>{item.text}</p>

                  {Array.isArray(item.phrases) && item.phrases.length ? (
                    <ul className={styles.phraseList}>
                      {item.phrases.map((phrase) => (
                        <li key={phrase}>{phrase}</li>
                      ))}
                    </ul>
                  ) : null}

                  {Array.isArray(item.records) && item.records.length ? (
                    <ul className={styles.emergencyList}>
                      {item.records.map((record) => (
                        <li key={record.id}>
                          <strong>{record.serviceLabel}</strong>
                          <span dir="ltr">{record.phoneNumber}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {item.action === 'emergency' ? (
                    <button
                      className="button button--secondary button--compact"
                      type="button"
                      onClick={openEmergencyMode}
                    >
                      {copy.openEmergency}
                    </button>
                  ) : null}

                  {Array.isArray(item.sources) && item.sources.length ? (
                    <div className={styles.sources}>
                      <strong>{copy.source}</strong>
                      {item.sources.map((source, index) => (
                        <div className={styles.sourceRow} key={`${source.label}-${index}`}>
                          {source.url ? (
                            <a href={source.url} target="_blank" rel="noreferrer">
                              {source.label}
                              <ExternalLink size={13} aria-hidden="true" />
                            </a>
                          ) : (
                            <span>{source.label}</span>
                          )}
                          {source.detail ? <small>{source.detail}</small> : null}
                          {source.verifiedAt ? (
                            <small>
                              {copy.verified}: {source.verifiedAt.slice(0, 10)}
                            </small>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
