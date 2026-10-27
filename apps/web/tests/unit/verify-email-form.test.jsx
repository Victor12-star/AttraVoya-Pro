import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  token: 'test-verification-token',
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams({ token: mocks.token }),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: mocks,
}));

const { VerifyEmailForm } = await import('../../src/features/auth/verify-email-form.jsx');

const authMessages = { working: 'Working', email: 'Email' };
const messages = {
  verifyInvalid: 'Invalid verification link.',
  verifySuccess: 'Verified.',
  verifyButton: 'Verify email',
  resendPrompt: 'Request another link',
  resendSent: 'Check your inbox.',
  resendFailed: 'Could not resend.',
  resendButton: 'Resend verification',
  backToSignIn: 'Sign in',
};

describe('email verification error feedback', () => {
  beforeEach(() => {
    mocks.verifyEmail.mockReset();
    mocks.resendVerification.mockReset();
    mocks.token = 'test-verification-token';
  });

  it.each([
    [400, 'Invalid verification link.'],
    [429, 'Too many verification attempts. Please try again later.'],
    [503, 'Email verification service is unavailable. Please try again later.'],
  ])('classifies verify HTTP %s safely', async (status, expected) => {
    mocks.verifyEmail.mockRejectedValue({ status });
    render(<VerifyEmailForm authMessages={authMessages} messages={messages} />);
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
    expect(mocks.verifyEmail).toHaveBeenCalledWith('test-verification-token');
  });

  it('labels resend rate limits without leaking account existence', async () => {
    mocks.resendVerification.mockRejectedValue({ status: 429 });
    render(<VerifyEmailForm authMessages={authMessages} messages={messages} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'person@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many requests. Please try again later.',
    );
    expect(mocks.resendVerification).toHaveBeenCalledWith('person@example.test');
  });

  it('prevents verification when the link has no token', () => {
    mocks.token = '';
    render(<VerifyEmailForm authMessages={authMessages} messages={messages} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid verification link.');
    expect(screen.getByRole('button', { name: 'Verify email' })).toBeDisabled();
    expect(mocks.verifyEmail).not.toHaveBeenCalled();
  });

  it('confirms verification once and disables repeat submissions', async () => {
    mocks.verifyEmail.mockResolvedValue({});
    render(<VerifyEmailForm authMessages={authMessages} messages={messages} />);
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Verified.');
    expect(screen.getByRole('button', { name: 'Verify email' })).toBeDisabled();
    expect(mocks.verifyEmail).toHaveBeenCalledTimes(1);
  });
});
