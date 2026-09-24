import { ApiClientError } from './errors.js';

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._~:-]{8,128}$/;
/** @type {Set<string>} */
const STRIPE_PRO_PLAN_KEYS = new Set(['PRO_MONTHLY', 'PRO_YEARLY']);

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

function normalizeIdempotencyKey(value) {
  if (typeof value !== 'string') {
    throw new TypeError('createBudgetPlanRequest requires an idempotency key.');
  }

  const normalized = value.trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(normalized)) {
    throw new TypeError('The planner idempotency key must contain 8 to 128 safe ASCII characters.');
  }
  return normalized;
}

function normalizeOpaqueId(value, label) {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) {
    throw new TypeError(`${label} must contain 1 to 128 characters.`);
  }
  return normalized;
}

function normalizeStripeProPlanKey(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Stripe checkout requires a Pro plan key.');
  }

  const normalized = value.trim();
  if (!STRIPE_PRO_PLAN_KEYS.has(normalized)) {
    throw new TypeError('Stripe checkout supports only PRO_MONTHLY or PRO_YEARLY.');
  }
  return normalized;
}

/**
 * Forward caller cancellation into the request-owned controller so the hard
 * client deadline remains active even when a screen supplies its own signal.
 */
function forwardAbort(controller, signal, markCallerAbort) {
  if (!signal) return () => {};

  const abort = () => {
    markCallerAbort();
    controller.abort();
  };
  if (signal.aborted) {
    abort();
    return () => {};
  }

  signal.addEventListener('abort', abort, { once: true });
  return () => signal.removeEventListener('abort', abort);
}

/**
 * Keep pre-network dependencies inside the request deadline. The underlying
 * platform lookup may not support cancellation, but callers can still recover.
 */
function waitForAbortable(value, signal) {
  return new Promise((resolve, reject) => {
    const stopWaiting = () => {
      signal.removeEventListener('abort', stopWaiting);
      reject(new DOMException('aborted', 'AbortError'));
    };

    if (signal.aborted) {
      stopWaiting();
      return;
    }

    signal.addEventListener('abort', stopWaiting, { once: true });
    Promise.resolve(value).then(
      (result) => {
        signal.removeEventListener('abort', stopWaiting);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener('abort', stopWaiting);
        reject(error);
      },
    );
  });
}

function invalidResponse(response, message, code = 'INVALID_API_RESPONSE') {
  return new ApiClientError(message, {
    status: response.status,
    code,
    requestId: response.headers.get('x-request-id'),
  });
}

/**
 * Bound JSON reads before decoding so a faulty endpoint cannot exhaust client
 * memory with an unexpectedly large payload.
 */
async function readResponseBody(response, maxResponseBytes) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') ?? '';
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
  const isJson = mediaType === 'application/json' || mediaType.endsWith('+json');
  if (!isJson) {
    if (response.ok) {
      throw invalidResponse(response, 'The server returned an unexpected response format.');
    }
    return null;
  }

  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
    throw invalidResponse(
      response,
      'The server response was too large to process safely.',
      'API_RESPONSE_TOO_LARGE',
    );
  }

  try {
    if (!response.body?.getReader) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > maxResponseBytes) {
        throw invalidResponse(
          response,
          'The server response was too large to process safely.',
          'API_RESPONSE_TOO_LARGE',
        );
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    }

    const reader = response.body.getReader();
    const chunks = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maxResponseBytes) {
        await reader.cancel();
        throw invalidResponse(
          response,
          'The server response was too large to process safely.',
          'API_RESPONSE_TOO_LARGE',
        );
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw invalidResponse(response, 'The server returned an unreadable response.');
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
    maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
  } = options ?? {};

  if (!baseUrl) throw new TypeError('createApiClient requires baseUrl.');
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes <= 0) {
    throw new TypeError('maxResponseBytes must be a positive safe integer.');
  }

  async function request(path, requestOptions = {}) {
    const controller = new AbortController();
    let abortSource = null;
    const timeout = setTimeout(() => {
      if (controller.signal.aborted) return;
      abortSource = 'timeout';
      controller.abort();
    }, requestOptions.timeoutMs ?? timeoutMs);
    const stopForwardingAbort = forwardAbort(controller, requestOptions.signal, () => {
      abortSource = 'caller';
    });

    try {
      const headers = new Headers(requestOptions.headers);
      headers.set('Accept', 'application/json');

      let body = requestOptions.body;
      if (body !== undefined && body !== null && !(body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(body);
      }

      const accessToken = getAccessToken
        ? await waitForAbortable(getAccessToken(), controller.signal)
        : null;
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

      const response = await fetchImpl(joinUrl(baseUrl, path), {
        method: requestOptions.method ?? 'GET',
        headers,
        body,
        credentials,
        signal: controller.signal,
        cache: requestOptions.cache,
      });

      const payload = await readResponseBody(response, maxResponseBytes);
      if (!response.ok) {
        const apiError = payload?.error;
        throw new ApiClientError(apiError?.message ?? 'The request could not be completed.', {
          status: response.status,
          code: apiError?.code ?? 'API_REQUEST_FAILED',
          requestId: apiError?.requestId ?? response.headers.get('x-request-id'),
          details: apiError?.details,
        });
      }

      const isEnvelope = payload !== null && typeof payload === 'object' && !Array.isArray(payload);
      if (response.status !== 204 && !isEnvelope) {
        throw invalidResponse(response, 'The server returned an unexpected response structure.');
      }

      return payload;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      if (controller.signal.aborted) {
        const timedOut = abortSource === 'timeout';
        throw new ApiClientError(
          timedOut ? 'The request timed out. Please try again.' : 'The request was cancelled.',
          {
            code: timedOut ? 'REQUEST_TIMEOUT' : 'REQUEST_ABORTED',
            cause: error,
          },
        );
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
      stopForwardingAbort();
    }
  }

  return {
    request,
    getCountries: (requestOptions = {}) =>
      request('/api/v1/countries', { cache: 'force-cache', ...requestOptions }),
    getLanguages: () => request('/api/v1/languages', { cache: 'force-cache' }),
    register: (body) => request('/api/v1/auth/register', { method: 'POST', body }),
    login: (body) => request('/api/v1/auth/login', { method: 'POST', body }),
    refresh: () => request('/api/v1/auth/refresh', { method: 'POST' }),
    logout: () => request('/api/v1/auth/logout', { method: 'POST' }),
    listAuthSessions: () => request('/api/v1/auth/sessions', { cache: 'no-store' }),
    revokeAuthSession: (sessionId) =>
      request(
        `/api/v1/auth/sessions/${encodeURIComponent(normalizeOpaqueId(sessionId, 'Session ID'))}`,
        { method: 'DELETE', cache: 'no-store' },
      ),
    revokeAllAuthSessions: () =>
      request('/api/v1/auth/sessions', { method: 'DELETE', cache: 'no-store' }),
    deleteCurrentAccount: (password) =>
      request('/api/v1/users/me', {
        method: 'DELETE',
        cache: 'no-store',
        body: { password },
      }),
    getMyEntitlements: () =>
      request('/api/v1/entitlements/me', {
        cache: 'no-store',
      }),
    getStripeCheckoutAvailability: () =>
      request('/api/v1/payments/checkout/availability', {
        cache: 'no-store',
      }),
    getStripePlanCatalog: () =>
      request('/api/v1/payments/checkout/stripe/plans', {
        cache: 'no-store',
      }),
    createStripeCheckout: (planKey) =>
      request('/api/v1/payments/checkout/stripe', {
        method: 'POST',
        cache: 'no-store',
        body: { planKey: normalizeStripeProPlanKey(planKey) },
      }),
    verifyEmail: (token) =>
      request('/api/v1/auth/verify-email', { method: 'POST', body: { token } }),
    resendVerification: (email) =>
      request('/api/v1/auth/resend-verification', { method: 'POST', body: { email } }),
    forgotPassword: (email) =>
      request('/api/v1/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (body) => request('/api/v1/auth/reset-password', { method: 'POST', body }),
    searchDestinations: (query, requestOptions) =>
      request(`/api/v1/destinations/search?${toSearchParams(query)}`, requestOptions),
    getWeather: (query, requestOptions) =>
      request(`/api/v1/weather?${toSearchParams(query)}`, requestOptions),
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
    searchImages: (query, requestOptions) =>
      request(`/api/v1/images/search?${toSearchParams(query)}`, requestOptions),
    translateText: (body) => request('/api/v1/translation', { method: 'POST', body }),
    getTranslationLanguages: () =>
      request('/api/v1/translation/languages', { cache: 'force-cache' }),
    getNearbyAccommodation: (query) => {
      const params = toSearchParams(query);
      return request(`/api/v1/accommodation/nearby?${params}`);
    },
    createBudgetPlanRequest: (body, idempotencyKey) =>
      request('/api/v1/planner/requests', {
        method: 'POST',
        headers: { 'Idempotency-Key': normalizeIdempotencyKey(idempotencyKey) },
        body,
      }),
    listBudgetPlanRequests: (query = {}) => {
      const params = toSearchParams(query);
      const suffix = params.size ? `?${params}` : '';
      return request(`/api/v1/planner/requests${suffix}`);
    },
    getBudgetPlanRequest: (requestId) =>
      request(`/api/v1/planner/requests/${encodeURIComponent(requestId)}`),
    getBudgetAllocation: (requestId) =>
      request(`/api/v1/planner/requests/${encodeURIComponent(requestId)}/allocation`),
    getPlannerDestinationCandidates: (requestId) =>
      request(`/api/v1/planner/requests/${encodeURIComponent(requestId)}/destination-candidates`),
    getPlannerAffordabilityEvidence: (requestId, destinationId) =>
      request(
        `/api/v1/planner/requests/${encodeURIComponent(requestId)}/destination-candidates/${encodeURIComponent(destinationId)}/affordability-evidence`,
      ),
  };
}
