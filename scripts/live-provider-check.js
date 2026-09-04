#!/usr/bin/env node

import assert from 'node:assert/strict';

import { createProviderCache } from '../apps/server/src/integrations/http/provider-cache.js';
import { createProviderHttpClient } from '../apps/server/src/integrations/http/provider-http-client.js';
import { createOpenMeteoWeatherProvider } from '../apps/server/src/integrations/weather/openmeteo-weather-provider.js';
import { createFrankfurterCurrencyProvider } from '../apps/server/src/integrations/currency/frankfurter-currency-provider.js';
import { createLibreTranslateProvider } from '../apps/server/src/integrations/translation/libretranslate-translation-provider.js';
import { createGeoapifyPlacesProvider } from '../apps/server/src/integrations/places/geoapify-places-provider.js';

function httpFor(provider) {
  return createProviderHttpClient({
    provider,
    timeoutMs: 15_000,
    retryMax: 1,
  });
}

async function checkOpenMeteo() {
  const provider = createOpenMeteoWeatherProvider({
    http: httpFor('openmeteo-live-ci'),
    cache: createProviderCache(),
    cacheTtlSeconds: 30,
  });

  const result = await provider.getForecast({
    latitude: 59.3293,
    longitude: 18.0686,
    forecastDays: 1,
  });

  assert.equal(result.provider, 'openmeteo');
  assert.ok(Number.isFinite(result.current.temperatureC));
  assert.equal(result.daily.length, 1);
  console.log('✓ Open-Meteo live check passed.');
}

async function checkFrankfurter() {
  const provider = createFrankfurterCurrencyProvider({
    http: httpFor('frankfurter-live-ci'),
    cache: createProviderCache(),
    cacheTtlSeconds: 30,
  });

  const result = await provider.convert({ amount: 100, from: 'SEK', to: 'EUR' });
  assert.equal(result.provider, 'frankfurter');
  assert.ok(result.rate > 0);
  assert.ok(result.convertedAmount > 0);
  console.log('✓ Frankfurter live check passed.');
}

async function checkLibreTranslate() {
  const provider = createLibreTranslateProvider({
    http: httpFor('libretranslate-live-ci'),
    baseUrl: process.env.LIBRETRANSLATE_URL || 'http://127.0.0.1:5001',
    languageCache: createProviderCache(),
    languageCacheTtlSeconds: 30,
  });

  const languages = await provider.getLanguages();
  assert.ok(languages.languages.some((language) => language.code === 'en'));
  assert.ok(languages.languages.some((language) => language.code === 'es'));

  const result = await provider.translate({ text: 'Hello', source: 'en', target: 'es' });
  assert.equal(result.provider, 'libretranslate');
  assert.ok(result.translatedText.trim().length > 0);
  assert.notEqual(result.translatedText.trim().toLowerCase(), 'hello');
  console.log('✓ LibreTranslate live check passed.');
}

async function checkGeoapifyWhenConfigured() {
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) {
    console.log(
      '○ Geoapify live check skipped: GEOAPIFY_API_KEY is not configured in GitHub Secrets.',
    );
    return;
  }

  const provider = createGeoapifyPlacesProvider({
    http: httpFor('geoapify-live-ci'),
    apiKey,
    cache: createProviderCache(),
    cacheTtlSeconds: 30,
  });

  const result = await provider.autocomplete({ query: 'Stockholm', limit: 3, language: 'en' });
  assert.equal(result.provider, 'geoapify');
  assert.ok(result.results.length > 0);
  console.log('✓ Geoapify live check passed.');
}

async function main() {
  await checkOpenMeteo();
  await checkFrankfurter();
  await checkLibreTranslate();
  await checkGeoapifyWhenConfigured();
  console.log('Live provider checks finished successfully.');
}

main().catch((error) => {
  console.error('Live provider verification failed.');
  console.error(error);
  process.exitCode = 1;
});
