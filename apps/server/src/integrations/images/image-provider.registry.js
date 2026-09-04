import { createPexelsImageProvider } from './pexels-image-provider.js';

export const IMAGE_PROVIDER_REGISTRY = Object.freeze({
  pexels: createPexelsImageProvider,
});
