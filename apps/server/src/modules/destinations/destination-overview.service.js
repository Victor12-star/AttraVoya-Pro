import { PLACE_CATEGORY_GROUPS } from '@attravoya/constants';

export const DESTINATION_SECTION_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  EMPTY: 'EMPTY',
  UNAVAILABLE: 'UNAVAILABLE',
});

function availableSection(result) {
  return {
    status: DESTINATION_SECTION_STATUS.AVAILABLE,
    provider: result?.provider ?? null,
    fetchedAt: result?.fetchedAt ?? null,
    data: result ?? null,
  };
}

function emptySection(result) {
  return {
    status: DESTINATION_SECTION_STATUS.EMPTY,
    provider: result?.provider ?? null,
    fetchedAt: result?.fetchedAt ?? null,
    data: result ?? null,
  };
}

function unavailableSection() {
  // Deliberately do not expose the provider exception. The global API error
  // handler still protects request-level failures, while an overview section
  // failure must remain isolated and safe for public clients.
  return {
    status: DESTINATION_SECTION_STATUS.UNAVAILABLE,
    provider: null,
    fetchedAt: null,
    data: null,
  };
}

async function settleSection(load, isEmpty = () => false) {
  try {
    const result = await load();
    return isEmpty(result) ? emptySection(result) : availableSection(result);
  } catch {
    return unavailableSection();
  }
}

/**
 * Build the first provider-neutral destination overview without allowing one
 * external service to take down the whole destination page. Each section has
 * its own availability status so the customer can still see working data when
 * a keyed provider is not configured or temporarily fails.
 */
export function createDestinationOverviewService({ placesProvider, weatherProvider, imageProvider }) {
  if (!placesProvider || typeof placesProvider.searchNearby !== 'function') {
    throw new TypeError('Destination overview requires a places provider.');
  }
  if (!weatherProvider || typeof weatherProvider.getForecast !== 'function') {
    throw new TypeError('Destination overview requires a weather provider.');
  }
  if (!imageProvider || typeof imageProvider.searchPhotos !== 'function') {
    throw new TypeError('Destination overview requires an image provider.');
  }

  return {
    async getOverview(query) {
      const destination = {
        name: query.name,
        countryCode: query.countryCode,
        latitude: query.latitude,
        longitude: query.longitude,
      };

      const [weather, attractions, restaurants, images] = await Promise.all([
        settleSection(() =>
          weatherProvider.getForecast({
            latitude: query.latitude,
            longitude: query.longitude,
            forecastDays: 5,
            timezone: 'auto',
          }),
        ),
        settleSection(
          () =>
            placesProvider.searchNearby({
              categoryGroup: PLACE_CATEGORY_GROUPS.ATTRACTIONS,
              latitude: query.latitude,
              longitude: query.longitude,
              radiusMeters: 8000,
              limit: 8,
              language: query.language,
            }),
          (result) => !Array.isArray(result?.results) || result.results.length === 0,
        ),
        settleSection(
          () =>
            placesProvider.searchNearby({
              categoryGroup: PLACE_CATEGORY_GROUPS.RESTAURANTS,
              latitude: query.latitude,
              longitude: query.longitude,
              radiusMeters: 5000,
              limit: 8,
              language: query.language,
            }),
          (result) => !Array.isArray(result?.results) || result.results.length === 0,
        ),
        settleSection(
          () =>
            imageProvider.searchPhotos({
              query: `${query.name} ${query.countryCode} travel`,
              orientation: 'landscape',
              locale: query.language,
              perPage: 3,
            }),
          (result) => !Array.isArray(result?.photos) || result.photos.length === 0,
        ),
      ]);

      return {
        destination,
        sections: {
          weather,
          attractions,
          restaurants,
          images,
        },
      };
    },
  };
}
