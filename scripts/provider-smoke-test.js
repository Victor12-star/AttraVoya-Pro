#!/usr/bin/env node

import assert from 'node:assert/strict';

import { createProviderCache } from '../apps/server/src/integrations/http/provider-cache.js';
import { createProviderHttpClient } from '../apps/server/src/integrations/http/provider-http-client.js';
import { createOpenMeteoWeatherProvider } from '../apps/server/src/integrations/weather/openmeteo-weather-provider.js';
import { createFrankfurterCurrencyProvider } from '../apps/server/src/integrations/currency/frankfurter-currency-provider.js';
import { createLibreTranslateProvider } from '../apps/server/src/integrations/translation/libretranslate-translation-provider.js';
import { createTicketmasterEventsProvider } from '../apps/server/src/integrations/events/ticketmaster-events-provider.js';
import { createNewsDataNewsProvider } from '../apps/server/src/integrations/news/newsdata-news-provider.js';
import { createPexelsImageProvider } from '../apps/server/src/integrations/images/pexels-image-provider.js';

/**
 * Dependency-light provider smoke test.
 *
 * It never calls the internet and never consumes API credits. The purpose is to
 * prove that core adapters normalize representative provider responses and that
 * the shared HTTP layer works before developers add real credentials.
 */
async function main() {
  const transport = createProviderHttpClient({
    provider: 'smoke',
    retryMax: 0,
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });
  assert.deepEqual(
    await transport.requestJson('https://provider.invalid/smoke'),
    { ok: true },
  );

  const weather = createOpenMeteoWeatherProvider({
    cache: createProviderCache(),
    http: {
      requestJson: async () => ({
        latitude: 59.33,
        longitude: 18.07,
        timezone: 'Europe/Stockholm',
        current: { temperature_2m: 19 },
        daily: {
          time: ['2026-09-03'],
          temperature_2m_max: [21],
          temperature_2m_min: [12],
        },
      }),
    },
  });
  const forecast = await weather.getForecast({
    latitude: 59.33,
    longitude: 18.07,
    forecastDays: 1,
  });
  assert.equal(forecast.current.temperatureC, 19);
  assert.equal(forecast.daily[0].temperatureMaxC, 21);

  const currency = createFrankfurterCurrencyProvider({
    cache: createProviderCache(),
    http: {
      requestJson: async () => ({
        date: '2026-09-03',
        base: 'SEK',
        quote: 'EUR',
        rate: 0.09,
      }),
    },
  });
  const conversion = await currency.convert({
    amount: 1000,
    from: 'SEK',
    to: 'EUR',
  });
  assert.equal(conversion.convertedAmount, 90);
  assert.equal(conversion.approximate, true);

  const translation = createLibreTranslateProvider({
    baseUrl: 'http://localhost:5001',
    http: { requestJson: async () => ({ translatedText: 'Hola' }) },
  });
  const translated = await translation.translate({
    text: 'Hello',
    source: 'en',
    target: 'es',
  });
  assert.equal(translated.translatedText, 'Hola');

  const events = createTicketmasterEventsProvider({
    apiKey: 'smoke-key',
    cache: createProviderCache(),
    http: {
      requestJson: async () => ({
        _embedded: {
          events: [
            {
              id: 'smoke-event',
              name: 'Test event',
              dates: { start: { localDate: '2026-10-10' } },
            },
          ],
        },
        page: {
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
        },
      }),
    },
  });
  const eventResult = await events.searchEvents({ countryCode: 'SE' });
  assert.equal(eventResult.provider, 'ticketmaster');
  assert.equal(eventResult.events[0].name, 'Test event');

  const news = createNewsDataNewsProvider({
    apiKey: 'smoke-key',
    cache: createProviderCache(),
    http: {
      requestJson: async () => ({
        status: 'success',
        totalResults: 1,
        results: [
          {
            article_id: 'smoke-news',
            title: 'Test travel update',
            source_name: 'Example News',
          },
        ],
      }),
    },
  });
  const newsResult = await news.searchNews({ countryCode: 'SE' });
  assert.equal(newsResult.provider, 'newsdata');
  assert.equal(newsResult.articles[0].title, 'Test travel update');

  const images = createPexelsImageProvider({
    apiKey: 'smoke-key',
    cache: createProviderCache(),
    http: {
      requestJson: async () => ({
        page: 1,
        per_page: 1,
        total_results: 1,
        photos: [
          {
            id: 1,
            url: 'https://www.pexels.com/photo/test-1/',
            photographer: 'Test Photographer',
            src: { landscape: 'https://images.pexels.com/test.jpeg' },
            alt: 'Test destination',
          },
        ],
      }),
    },
  });
  const imageResult = await images.searchPhotos({ query: 'Stockholm' });
  assert.equal(imageResult.provider, 'pexels');
  assert.equal(imageResult.photos[0].alt, 'Test destination');
  assert.equal(imageResult.attribution.providerLinkRequired, true);

  console.log('Provider smoke tests passed. No external API calls were made.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
