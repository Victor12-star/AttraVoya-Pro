import { describe, expect, it } from 'vitest';

import { ProviderUnavailableError } from '../../errors/app-error.js';
import { ACCOMMODATION_PROVIDER_REGISTRY } from '../accommodation/accommodation-provider.registry.js';
import { EVENTS_PROVIDER_REGISTRY } from '../events/events-provider.registry.js';
import { IMAGE_PROVIDER_REGISTRY } from '../images/image-provider.registry.js';
import { MAPS_PROVIDER_REGISTRY } from '../maps/maps-provider.registry.js';
import { NEWS_PROVIDER_REGISTRY } from '../news/news-provider.registry.js';
import { PLACES_PROVIDER_REGISTRY } from '../places/places-provider.registry.js';

describe('explicitly disabled staging integrations', () => {
  const providers = [
    [PLACES_PROVIDER_REGISTRY, ['autocomplete', 'searchNearby']],
    [MAPS_PROVIDER_REGISTRY, ['geocode', 'reverseGeocode', 'route']],
    [ACCOMMODATION_PROVIDER_REGISTRY, ['searchNearby']],
    [EVENTS_PROVIDER_REGISTRY, ['searchEvents']],
    [NEWS_PROVIDER_REGISTRY, ['searchNews']],
    [IMAGE_PROVIDER_REGISTRY, ['searchPhotos']],
  ];

  for (const [registry, methods] of providers) {
    it(`supports none for ${methods.join(', ')}`, async () => {
      const provider = registry.none();
      for (const method of methods) {
        await expect(provider[method]()).rejects.toBeInstanceOf(ProviderUnavailableError);
      }
    });
  }
});
