import { ApiClientError } from './errors.js';

const DEFAULT_TIMEOUT_MS = 12_000;

function joinUrl(baseUrl, path) {
  return `${String(baseUrl).replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
}

function toSearchParams(input = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return params;
}

async function readResponseBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;

  try {
    return await response.json();
  } catch {
    throw new ApiClientError('The server returned an unreadable response.', {
      status: response.status,
      code: 'INVALID_API_RESPONSE',
      requestId: response.headers.get('x-request-id'),
    });
  }
}

/**
 * Create one API client that can be shared by web, Admin and mobile.
 *
 * Browser clients normally use secure same-site cookies (`credentials=include`).
 * Mobile can provide `getAccessToken` to attach a Bearer token from SecureStore.
 * Keeping this transport logic centralized prevents each screen from inventing
 * different error handling or authentication behavior.
 */
export function createApiClient(options) {
  const {
    baseUrl,
    fetchImpl = globalThis.fetch,
    getAccessToken,
    credentials = 'include',
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options ?? {};

  if (!baseUrl) throw new TypeError('createApiClient requires baseUrl.');
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');

  async function request(path, requestOptions = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestOptions.timeoutMs ?? timeoutMs);

    try {
      const headers = new Headers(requestOptions.headers);
      headers.set('Accept', 'application/json');

      let body = requestOptions.body;
      if (body !== undefined && body !== null && !(body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(body);
      }

      const accessToken = getAccessToken ? await getAccessToken() : null;
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

      const response = await fetchImpl(joinUrl(baseUrl, path), {
        method: requestOptions.method ?? 'GET',
        headers,
        body,
        credentials,
        signal: requestOptions.signal ?? controller.signal,
        cache: requestOptions.cache,
      });

      const payload = await readResponseBody(response);
      if (!response.ok) {
        const apiError = payload?.error;
        throw new ApiClientError(apiError?.message ?? 'The request could not be completed.', {
          status: response.status,
          code: apiError?.code ?? 'API_REQUEST_FAILED',
          requestId: apiError?.requestId ?? response.headers.get('x-request-id'),
          details: apiError?.details,
        });
      }

      return payload;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      if (error?.name === 'AbortError') {
        throw new ApiClientError('The request timed out. Please try again.', {
          code: 'REQUEST_TIMEOUT',
          cause: error,
        });
      }
      throw new ApiClientError(
        'Unable to reach AttraVoya Pro. Check your connection and try again.',
        {
          code: 'NETWORK_ERROR',
          cause: error,
        },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    request,
    getCountries: () => request('/api/v1/countries', { cache: 'force-cache' }),
    getLanguages: () => request('/api/v1/languages', { cache: 'force-cache' }),
    register: (body) => request('/api/v1/auth/register', { method: 'POST', body }),
    login: (body) => request('/api/v1/auth/login', { method: 'POST', body }),
    refresh: () => request('/api/v1/auth/refresh', { method: 'POST' }),
    logout: () => request('/api/v1/auth/logout', { method: 'POST' }),
    verifyEmail: (token) =>
      request('/api/v1/auth/verify-email', { method: 'POST', body: { token } }),
    resendVerification: (email) =>
      request('/api/v1/auth/resend-verification', { method: 'POST', body: { email } }),
    forgotPassword: (email) =>
      request('/api/v1/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (body) => request('/api/v1/auth/reset-password', { method: 'POST', body }),
    searchDestinations: (query) => request(`/api/v1/destinations/search?${toSearchParams(query)}`),
    getWeather: (query) => request(`/api/v1/weather?${toSearchParams(query)}`),
    getCurrencyRates: ({ base = 'EUR', quotes = [] } = {}) =>
      request(
        `/api/v1/currency/rates?${toSearchParams({ base, ...(quotes.length ? { quotes } : {}) })}`,
      ),
    convertCurrency: ({ amount, from, to }) =>
      request(`/api/v1/currency/convert?${toSearchParams({ amount, from, to })}`),
    getEmergencyRecords: (query) => request(`/api/v1/emergency?${toSearchParams(query)}`),
    autocompletePlaces: (query) => request(`/api/v1/places/autocomplete?${toSearchParams(query)}`),
    getNearbyPlaces: (query) => request(`/api/v1/places/nearby?${toSearchParams(query)}`),
    getMapRoute: (query) => request(`/api/v1/maps/route?${toSearchParams(query)}`),
    getEvents: (query) => request(`/api/v1/events?${toSearchParams(query)}`),
    getNews: (query) => request(`/api/v1/news?${toSearchParams(query)}`),
    searchImages: (query) => request(`/api/v1/images/search?${toSearchParams(query)}`),
    translateText: (body) => request('/api/v1/translation', { method: 'POST', body }),
    getTranslationLanguages: () =>
      request('/api/v1/translation/languages', { cache: 'force-cache' }),
    getNearbyAccommodation: (query) => {
      const params = toSearchParams(query);
      return request(`/api/v1/accommodation/nearby?${params}`);
    },
    createBudgetPlanRequest: (body) =>
      request('/api/v1/planner/requests', { method: 'POST', body }),
    listBudgetPlanRequests: () => request('/api/v1/planner/requests'),
    getBudgetPlanRequest: (requestId) =>
      request(`/api/v1/planner/requests/${encodeURIComponent(requestId)}`),
  };
}