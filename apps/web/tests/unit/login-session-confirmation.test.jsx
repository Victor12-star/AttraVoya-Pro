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

  it('shows an error instead of redirecting when the browser session was not retained', async () => {
    mocks.listAuthSessions.mockRejectedValue({ status: 401 });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in.');
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
