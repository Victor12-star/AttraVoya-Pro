import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import QueryContentState, {
  getQueryContentState,
} from '../src/components/feedback/query-content-state.jsx';
import { createMobileApiClient, normalizeApiBaseUrl } from '../src/services/api-client.js';

describe('mobile API boundary', () => {
  it('accepts HTTPS configuration and removes a trailing slash', () => {
    expect(normalizeApiBaseUrl(' https://api.attravoya.example/ ')).toBe(
      'https://api.attravoya.example',
    );
  });

  it.each([
    ['an empty value', ''],
    ['credentials', 'https://user:secret@api.attravoya.example'],
    ['a query string', 'https://api.attravoya.example?debug=true'],
    ['a fragment', 'https://api.attravoya.example#internal'],
    ['an unsupported protocol', 'file:///private/config'],
    ['insecure production transport', 'http://api.attravoya.example'],
  ])('rejects %s in API configuration', (_label, value) => {
    expect(() => normalizeApiBaseUrl(value)).toThrow('The mobile API configuration is invalid.');
  });

  it('allows explicit insecure transport for local development only', () => {
    expect(normalizeApiBaseUrl('http://192.168.1.25:5000/', { allowInsecure: true })).toBe(
      'http://192.168.1.25:5000',
    );
  });

  it('creates a cookie-free client for installed applications', async () => {
    const fetchImpl = jest.fn(async (_url, options) => {
      expect(options.credentials).toBe('omit');
      return new globalThis.Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createMobileApiClient({
      baseUrl: 'https://api.attravoya.example',
      fetchImpl,
      getAccessToken: () => null,
    });

    await expect(client.request('/api/v1/example')).resolves.toEqual({
      ok: true,
    });
  });

  it('maps offline failures without exposing diagnostic details', async () => {
    const retry = jest.fn();
    const { getByText, queryByText } = await render(
      <QueryContentState
        error={{ code: 'NETWORK_ERROR', message: 'socket 10.0.0.4 refused' }}
        onRetry={retry}
      />,
    );

    expect(getByText('You appear to be offline')).toBeTruthy();
    expect(queryByText(/10\.0\.0\.4/)).toBeNull();

    fireEvent.press(getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  }, 20_000);

  it('does not show an error when a disposed screen cancels its request', async () => {
    const { toJSON } = await render(<QueryContentState error={{ code: 'REQUEST_ABORTED' }} />);

    expect(toJSON()).toBeNull();
    expect(getQueryContentState({ code: 'REQUEST_ABORTED' })).toBeNull();
  }, 20_000);
});
