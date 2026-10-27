import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  token: 'test-reset-token',
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams({ token: mocks.token }),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { resetPassword: mocks.resetPassword },
}));

const { ResetPasswordForm } = await import('../../src/features/auth/reset-password-form.jsx');

const authMessages = { working: 'Working' };
const messages = {
  resetInvalid: 'Invalid link.',
  passwordMismatch: 'Passwords do not match.',
  resetSuccess: 'Password changed.',
  newPassword: 'New password',
  confirmNewPassword: 'Confirm new password',
  resetButton: 'Reset password',
  backToSignIn: 'Sign in',
};

describe('password reset form', () => {
  beforeEach(() => {
    mocks.resetPassword.mockReset();
    mocks.token = 'test-reset-token';
  });

  it('preserves the form element after the request completes', async () => {
    mocks.resetPassword.mockResolvedValue({});
    render(<ResetPasswordForm authMessages={authMessages} messages={messages} />);
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'new-password-123' } });
    fireEvent.change(inputs[1], { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => expect(mocks.resetPassword).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Password changed.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(inputs[0].value).toBe('');
    expect(inputs[1].value).toBe('');
  });

  it.each([
    [429, 'Too many reset attempts. Please try again later.'],
    [503, 'Password reset service is unavailable. Please try again later.'],
    [400, 'Invalid link.'],
  ])('shows safe feedback for HTTP %s', async (status, expected) => {
    mocks.resetPassword.mockRejectedValue({ status });
    render(<ResetPasswordForm authMessages={authMessages} messages={messages} />);
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'new-password-123' } });
    fireEvent.change(inputs[1], { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('rejects mismatched passwords without calling the API', async () => {
    render(<ResetPasswordForm authMessages={authMessages} messages={messages} />);
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'new-password-123' } });
    fireEvent.change(inputs[1], { target: { value: 'different-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });

  it('blocks reset submissions without a recovery token', () => {
    mocks.token = '';
    render(<ResetPasswordForm authMessages={authMessages} messages={messages} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid link.');
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeDisabled();
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });

});
