import { describe, expect, it } from 'vitest';
import { authRequestErrorMessage } from '../../src/features/auth/auth-request-error.js';

const messages = {
  generic: 'Could not request password reset.',
  unavailable: 'Password recovery service is unavailable. Please try again later.',
  throttled: 'Too many reset requests. Please try again later.',
};

describe('safe password-recovery error classification', () => {
  it.each([
    [{ code: 'NETWORK_ERROR' }, messages.unavailable],
    [{ status: 502 }, messages.unavailable],
    [{ status: 429 }, messages.throttled],
    [{ status: 400 }, messages.generic],
    [{ status: 401 }, messages.generic],
  ])('classifies a request failure without exposing internal errors', (failure, expected) => {
    expect(authRequestErrorMessage(failure, messages)).toBe(expected);
  });
});
