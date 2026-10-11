import { AsyncLocalStorage } from 'node:async_hooks';

const requestContextStorage = new AsyncLocalStorage();
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeRequestId(value) {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value) ? value : null;
}

export function runWithRequestContext(requestId, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Request context callback is required.');
  }

  const normalizedRequestId = safeRequestId(requestId);
  return requestContextStorage.run(
    normalizedRequestId ? Object.freeze({ requestId: normalizedRequestId }) : Object.freeze({}),
    callback,
  );
}

export function getCurrentRequestId() {
  return requestContextStorage.getStore()?.requestId ?? null;
}
