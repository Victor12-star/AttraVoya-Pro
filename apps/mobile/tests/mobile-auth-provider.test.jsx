import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import {
  MobileAuthProvider,
  parsePasswordResetRequestResponse,
  parseRegistrationResponse,
  parseVerificationResendResponse,
  safeAuthMessage,
  safeAccountDeletionMessage,
  useMobileAuth,
} from '../src/providers/mobile-auth-provider.jsx';

function AuthProbe() {
  const auth = useMobileAuth();
  return (
    <>
      <Text>{auth.status}</Text>
      {auth.error ? <Text>{auth.error}</Text> : null}
      <Pressable accessibilityRole="button" onPress={auth.retryRestore}>
        <Text>Retry restore</Text>
      </Pressable>
    </>
  );
}

function createClient(overrides = {}) {
  return {
    restoreMobileSession: jest.fn(async () => null),
    mobileLogin: jest.fn(),
    mobileLogout: jest.fn(async () => undefined),
    deleteCurrentAccount: jest.fn(),
    register: jest.fn(),
    forgotPassword: jest.fn(),
    resendVerification: jest.fn(),
    ...overrides,
  };
}

describe('mobile authentication provider', () => {
  it('preserves the specific unverified-email recovery message for HTTP 401 responses', () => {
    expect(safeAuthMessage({ code: 'EMAIL_NOT_VERIFIED', status: 401 })).toBe(
      'Verify your email before signing in.',
    );
  });

  it('maps account deletion failures without exposing server details', () => {
    expect(safeAccountDeletionMessage({ code: 'INVALID_CREDENTIALS' })).toBe(
      'The password is incorrect.',
    );
    expect(safeAccountDeletionMessage({ code: 'NETWORK_ERROR', message: 'socket detail' })).toBe(
      'You appear to be offline. Connect to the internet and try again.',
    );
    expect(safeAccountDeletionMessage({ status: 500, message: 'database detail' })).toBe(
      'We could not delete your account. Please try again.',
    );
  });

  it('restores an authenticated session before protected navigation renders', async () => {
    const client = createClient({
      restoreMobileSession: jest.fn(async () => ({
        user: { id: 'user-1', email: 'user@example.test', roles: ['USER'], emailVerified: true },
      })),
    });
    const { getByText } = await render(
      <MobileAuthProvider client={client}>
        <AuthProbe />
      </MobileAuthProvider>,
    );

    await waitFor(() => expect(getByText('authenticated')).toBeTruthy());
  });

  it('treats a server-rejected restored session as signed out', async () => {
    const client = createClient({
      restoreMobileSession: jest.fn(async () => {
        throw Object.assign(new Error('private server detail'), {
          code: 'MOBILE_SESSION_EXPIRED',
        });
      }),
    });
    const { getByText, queryByText } = await render(
      <MobileAuthProvider client={client}>
        <AuthProbe />
      </MobileAuthProvider>,
    );

    await waitFor(() => expect(getByText('anonymous')).toBeTruthy());
    expect(queryByText(/private server detail/i)).toBeNull();
  });

  it('keeps an offline restore recoverable and retries only on request', async () => {
    const restoreMobileSession = jest
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('socket detail'), { code: 'MOBILE_SESSION_NETWORK_ERROR' }),
      )
      .mockResolvedValueOnce({
        user: { id: 'user-1', email: 'user@example.test', roles: ['USER'], emailVerified: true },
      });
    const client = createClient({ restoreMobileSession });
    const { getByText, queryByText } = await render(
      <MobileAuthProvider client={client}>
        <AuthProbe />
      </MobileAuthProvider>,
    );

    await waitFor(() => expect(getByText('error')).toBeTruthy());
    expect(getByText(/appear to be offline/i)).toBeTruthy();
    expect(queryByText(/socket detail/i)).toBeNull();

    await act(async () => fireEvent.press(getByText('Retry restore')));
    await waitFor(() => expect(getByText('authenticated')).toBeTruthy());
    expect(restoreMobileSession).toHaveBeenCalledTimes(2);
  });

  it('validates registration responses before exposing them to the screen', () => {
    expect(parseRegistrationResponse({ user: { id: 'missing-fields' } })).toBeNull();
    expect(
      parseRegistrationResponse({
        user: { id: 'user-1', email: 'user@example.test', emailVerified: false },
        verificationDelivery: 'sent',
        message: 'Account created.',
      }),
    ).toMatchObject({ verificationDelivery: 'sent' });
  });

  it('rejects malformed password-reset request responses', () => {
    expect(parsePasswordResetRequestResponse({ message: '' })).toBeNull();
    expect(
      parsePasswordResetRequestResponse({ message: 'Instructions sent.', extra: true }),
    ).toBeNull();
    expect(parsePasswordResetRequestResponse({ message: 'Instructions sent.' })).toEqual({
      message: 'Instructions sent.',
    });
  });

  it('validates verification-resend responses before exposing success', () => {
    expect(parseVerificationResendResponse(null)).toBeNull();
    expect(parseVerificationResendResponse({ message: 'Sent.', extra: true })).toBeNull();
    expect(parseVerificationResendResponse({ message: 'Sent.' })).toEqual({ message: 'Sent.' });
  });
});
