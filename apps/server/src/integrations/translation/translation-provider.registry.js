import { createLibreTranslateProvider } from './libretranslate-translation-provider.js';

export const TRANSLATION_PROVIDER_REGISTRY = Object.freeze({
  libretranslate: createLibreTranslateProvider,
});
