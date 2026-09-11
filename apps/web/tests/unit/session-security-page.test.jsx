import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listAuthSessions: vi.fn(),
  revokeAuthSession: vi.fn(),
  revokeAllAuthSessions: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    listAuthSessions: mocks.listAuthSessions,
    revokeAuthSession: mocks.revokeAuthSession,
    revokeAllAuthSessions: mocks.revokeAllAuthSessions,
  },
}));

const { SessionSecurityPage } = await import(
  '../../src/features/profile/session-security-page.jsx'
);
const { getSessionSecurityCopy } = await import(
  '../../src/features/profile/session-security-copy.js'
);

const copy = getSessionSecurityCopy('en');
const common = { loading: 'Loading…', retry: 'Retry', cancel: 'Cancel' };

function session(overrides = {}) {
  return {
    id: 'session-1',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152.0.0.0 Safari/537.36',
    createdAt: '2026-09-10T10:00:00.000Z',
    lastUsedAt: '2026-09-11T10:30:00.000Z',
    expiresAt: '2026-10-10T10:00:00.000Z',
    refreshTokenHash: 'must-never-render-refresh-hash',
    ipHash: 'must-never-render-ip-hash',
    ...overrides,
  };
}

function renderPage() {
  return render(
    <SessionSecurityPage
      locale="en"
      copy={copy}
      common={common}
      signInLabel="Sign in"
    />,
  );
}

describe('SessionSecurityPage', () => {
  beforeEach(() => {
    mocks.listAuthSessions.mockReset();
    mocks.revokeAuthSession.mockReset();
    mocks.revokeAllAuthSessions.mockReset();
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
    mocks.listAuthSessions.mockResolvedValue({ sessions: [session()] });
    mocks.revokeAuthSession.mockResolvedValue(null);
    mocks.revokeAllAuthSessions.mockResolvedValue(null);
  });

  it('renders only minimized, human-readable session metadata', async () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Sessions & devices', level: 1 }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Chrome · Windows' })).toBeInTheDocument();
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('Last used')).toBeInTheDocument();
    expect(screen.getByText('Expires')).toBeInTheDocument();
    expect(screen.queryByText(/Mozilla\/5\.0/)).not.toBeInTheDocument();
    expect(screen.queryByText('must-never-render-refresh-hash')).not.toBeInTheDocument();
    expect(screen.queryByText('must-never-render-ip-hash')).not.toBeInTheDocument();
    expect(screen.getByText(/No additional device fingerprinting/i)).toBeInTheDocument();
  });

  it('shows an actionable sign-in state instead of leaking an authentication error', async () => {
    mocks.listAuthSessions.mockRejectedValueOnce({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'private backend details',
    });

    renderPage();

    expect(
      await screen.findByText('Sign in to review and manage your active sessions.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('private backend details')).not.toBeInTheDocument();
  });

  it('retries a failed list request through the same private API contract', async () => {
    mocks.listAuthSessions
      .mockRejectedValueOnce(new Error('network internals'))
      .mockResolvedValueOnce({ sessions: [session()] });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your sessions could not be loaded right now.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Chrome · Windows' })).toBeInTheDocument();
    expect(mocks.listAuthSessions).toHaveBeenCalledTimes(2);
  });

  it('blocks duplicate targeted revocation and removes the card only after server success', async () => {
    let resolveRevoke;
    mocks.revokeAuthSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRevoke = resolve;
        }),
    );

    renderPage();
    await screen.findByRole('heading', { name: 'Chrome · Windows' });
    const button = screen.getByRole('button', { name: 'Revoke session: Chrome · Windows' });

    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.revokeAuthSession).toHaveBeenCalledTimes(1);
    expect(mocks.revokeAuthSession).toHaveBeenCalledWith('session-1');
    expect(screen.getByRole('heading', { name: 'Chrome · Windows' })).toBeInTheDocument();

    resolveRevoke(null);
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Chrome · Windows' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/Session revoked\./)).toBeInTheDocument();
  });

  it('requires explicit confirmation before revoking every session and redirects after success', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Chrome · Windows' });

    fireEvent.click(screen.getByRole('button', { name: 'Sign out everywhere' }));
    expect(mocks.revokeAllAuthSessions).not.toHaveBeenCalled();
    expect(
      screen.getByText('Are you sure? You will need to sign in again on every device.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm sign out everywhere' }));

    await waitFor(() => expect(mocks.revokeAllAuthSessions).toHaveBeenCalledTimes(1));
    expect(mocks.replace).toHaveBeenCalledWith('/login');
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
