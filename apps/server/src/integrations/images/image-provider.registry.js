import { createUnavailableProvider } from '../http/unavailable-provider.js';
import { createPexelsImageProvider } from './pexels-image-provider.js';

export const IMAGE_PROVIDER_REGISTRY = Object.freeze({
  none: () => createUnavailableProvider('images', ['searchPhotos']),
  pexels: createPexelsImageProvider,
});
