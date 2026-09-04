import { describe, expect, it, vi } from 'vitest';

import { ProviderAuthenticationError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createPexelsImageProvider } from './pexels-image-provider.js';

const payload = {
  page: 1,
  per_page: 1,
  total_results: 25,
  next_page: 'https://api.pexels.com/v1/search?page=2',
  photos: [
    {
      id: 123,
      width: 3000,
      height: 2000,
      url: 'https://www.pexels.com/photo/stockholm-123/',
      photographer: 'Example Photographer',
      photographer_url: 'https://www.pexels.com/@example',
      photographer_id: 456,
      avg_color: '#789ABC',
      alt: 'Stockholm waterfront',
      liked: false,
      src: {
        original: 'https://images.pexels.com/photos/123/original.jpeg',
        large: 'https://images.pexels.com/photos/123/large.jpeg',
        medium: 'https://images.pexels.com/photos/123/medium.jpeg',
        landscape: 'https://images.pexels.com/photos/123/landscape.jpeg',
      },
    },
  ],
};

describe('Pexels image adapter', () => {
  it('normalizes, attributes, filters, and caches photo search results', async () => {
    const http = { requestJson: vi.fn().mockResolvedValue(payload) };
    const provider = createPexelsImageProvider({
      http,
      apiKey: 'test-key',
      cache: createProviderCache(),
      cacheTtlSeconds: 600,
    });
    const query = {
      query: 'Stockholm travel',
      orientation: 'landscape',
      size: 'large',
      locale: 'sv-SE',
      page: 1,
      perPage: 12,
    };

    const first = await provider.searchPhotos(query);
    const second = await provider.searchPhotos(query);

    expect(first.photos).toHaveLength(1);
    expect(first.photos[0].externalId).toBe('123');
    expect(first.photos[0].alt).toBe('Stockholm waterfront');
    expect(first.photos[0].photographer.name).toBe(
      'Example Photographer',
    );
    expect(first.attribution.providerLinkRequired).toBe(true);
    expect(first.page.hasNext).toBe(true);
    expect(second).toEqual(first);
    expect(http.requestJson).toHaveBeenCalledTimes(1);

    const [requestedUrl, requestOptions] = http.requestJson.mock.calls[0];
    expect(requestedUrl.searchParams.get('query')).toBe('Stockholm travel');
    expect(requestedUrl.searchParams.get('orientation')).toBe('landscape');
    expect(requestedUrl.searchParams.get('size')).toBe('large');
    expect(requestedUrl.searchParams.get('locale')).toBe('sv-SE');
    expect(requestedUrl.searchParams.get('per_page')).toBe('12');
    expect(requestOptions.headers.Authorization).toBe('test-key');
  });

  it('fails before making a request when the API key is missing', async () => {
    const http = { requestJson: vi.fn() };
    const provider = createPexelsImageProvider({
      http,
      apiKey: '',
      cache: createProviderCache(),
    });

    await expect(
      provider.searchPhotos({ query: 'Stockholm' }),
    ).rejects.toBeInstanceOf(ProviderAuthenticationError);
    expect(http.requestJson).not.toHaveBeenCalled();
  });
});
