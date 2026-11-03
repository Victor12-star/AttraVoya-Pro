import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionSecurityPanel } from '../../src/features/auth/session-security-panel.jsx';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  refresh.mockReset();
});

describe('Owner session security controls', () => {
  it('lists active sessions without exposing private tokens', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sessions: [{
          id: 'session-id', userAgent: 'Test Browser',
          createdAt: '2026-11-01T12:00:00.000Z',
          lastUsedAt: '2026-11-03T12:00:00.000Z',
          expiresAt: '2026-12-01T12:00:00.000Z',
        }],
      }),
    })));
    render(<SessionSecurityPanel />);
    expect(await screen.findByText('Test Browser')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke session' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out all devices' })).toBeDisabled();
    expect(screen.queryByText(/refreshTokenHash/i)).not.toBeInTheDocument();
  });

  it('requires typed confirmation before revoking all sessions', async () => {
    const fetchMock = vi.fn(async (_url, options) => {
      if (options?.method === 'DELETE') return { ok: true, json: async () => ({ ok: true }) };
      return { ok: true, json: async () => ({ sessions: [] }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<SessionSecurityPanel />);
    expect(await screen.findByText('No active refresh sessions found.')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Sign out all devices' });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Type SIGN OUT ALL to confirm'), 'SIGN OUT ALL');
    await user.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/sessions',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'same-origin',
        body: JSON.stringify({ confirmation: 'SIGN OUT ALL' }),
      }),
    ));
    expect(replace).toHaveBeenCalledWith('/login?sessionsRevoked=1');
  });

  it('reports backend errors without falsely claiming revocation succeeded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Session expired. Please sign in again.' }),
    })));
    render(<SessionSecurityPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Session expired');
    expect(replace).not.toHaveBeenCalled();
  });
});
