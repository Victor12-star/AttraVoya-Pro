import ContentState from './content-state.jsx';

const SAFE_ERROR_STATES = Object.freeze({
  NETWORK_ERROR: {
    kind: 'offline',
  },
  REQUEST_TIMEOUT: {
    kind: 'error',
    title: 'The request took too long',
    message: 'The service did not respond in time. Check your connection and try again.',
  },
  INVALID_API_RESPONSE: {
    kind: 'error',
    title: 'This information is unavailable',
    message: 'The service returned information that could not be used safely. Please try again.',
  },
  API_RESPONSE_TOO_LARGE: {
    kind: 'error',
    title: 'This information is unavailable',
    message: 'The service returned more information than the app can process safely.',
  },
});

/**
 * Convert technical failures into safe presentation data. Cancellation is not
 * an error state because it normally means the traveller left the screen.
 */
export function getQueryContentState(error) {
  if (error?.code === 'REQUEST_ABORTED') return null;

  const knownState = SAFE_ERROR_STATES[error?.code];
  if (knownState) return knownState;

  if (error?.status === 401) {
    return {
      kind: 'error',
      title: 'Sign in required',
      message: 'Please sign in again to continue.',
    };
  }

  if (error?.status === 403) {
    return {
      kind: 'error',
      title: 'Access unavailable',
      message: 'Your account does not have access to this information.',
    };
  }

  if (error?.status === 429) {
    return {
      kind: 'error',
      title: 'Please wait a moment',
      message: 'Too many requests were made. Please try again shortly.',
    };
  }

  return {
    kind: 'error',
  };
}

export default function QueryContentState({ error, isEmpty, isLoading, onRetry }) {
  if (isLoading) return <ContentState kind="loading" />;

  if (error) {
    const state = getQueryContentState(error);
    if (!state) return null;

    return (
      <ContentState {...state} actionLabel={onRetry ? 'Try again' : undefined} onAction={onRetry} />
    );
  }

  if (isEmpty) return <ContentState kind="empty" />;
  return null;
}
