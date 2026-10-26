import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  listAuthSessions: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { login: mocks.login, listAuthSessions: mocks.listAuthSessions },
}));

const { LoginForm } = await import('../../src/features/auth/login-form.jsx');

const messages = {
  email: 'Email',
  password: 'Password',
  working: 'Signing in',
  signIn: 'Sign in',
  newHere: 'New here?',
  createAccount: 'Create account',
  loginFailed: 'Unable to sign in.',
};
const recoveryMessages = { forgotLink: 'Forgot password?' };

function submit() {
  render(<LoginForm messages={messages} recoveryMessages={recoveryMessages} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'test@example.com' },
  });
  const password = document.querySelector('input[name="password"]');
  fireEvent.change(password, { target: { value: 'safe-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginForm browser session confirmation', () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.listAuthSessions.mockReset();
    mocks.push.mockReset();
    mocks.refresh.mockReset();
    mocks.login.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('redirects only after the follow-up request authenticates with its cookie', async () => {
    mocks.listAuthSessions.mockResolvedValue({ sessions: [] });
    submit();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/trips'));
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.listAuthSessions).toHaveBeenCalledTimes(1);
  });

  it('keeps the credential failure message generic when the login request itself fails', async () => {
    mocks.login.mockRejectedValue({ status: 401 });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in.');
    expect(mocks.listAuthSessions).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: 'NETWORK_ERROR' }, 'Sign-in service is unavailable.'],
    [{ status: 503 }, 'Sign-in service is unavailable.'],
    [{ status: 429 }, 'Too many sign-in attempts.'],
  ])('distinguishes a service problem from incorrect credentials', async (failure, message) => {
    mocks.login.mockRejectedValue(failure);
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(mocks.listAuthSessions).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('shows an error instead of redirecting when the browser session was not retained', async () => {
    mocks.listAuthSessions.mockRejectedValue({ status: 401 });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign-in was accepted, but this browser could not confirm your session.',
    );
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
