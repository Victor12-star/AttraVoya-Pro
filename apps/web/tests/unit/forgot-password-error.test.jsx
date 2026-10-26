import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ forgotPassword: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { forgotPassword: mocks.forgotPassword },
}));

const { ForgotPasswordForm } = await import('../../src/features/auth/forgot-password-form.jsx');

const authMessages = { email: 'Email', working: 'Working' };
const messages = {
  resetSent: 'If an account exists, check your email.',
  resetFailed: 'Could not request password reset.',
  sendReset: 'Send reset link',
  backToSignIn: 'Back',
};

function submit() {
  render(<ForgotPasswordForm authMessages={authMessages} messages={messages} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'traveller@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
}

describe('password reset request error handling', () => {
  beforeEach(() => mocks.forgotPassword.mockReset());

  it.each([
    [{ code: 'NETWORK_ERROR' }, 'Password recovery service is unavailable.'],
    [{ status: 502 }, 'Password recovery service is unavailable.'],
    [{ status: 429 }, 'Too many reset requests.'],
    [{ status: 400 }, 'Could not request password reset.'],
  ])('shows a safe, useful request error', async (failure, message) => {
    mocks.forgotPassword.mockRejectedValue(failure);
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the success text generic for account privacy', async () => {
    mocks.forgotPassword.mockResolvedValue({});
    submit();
    expect(await screen.findByRole('status')).toHaveTextContent(messages.resetSent);
  });
});
