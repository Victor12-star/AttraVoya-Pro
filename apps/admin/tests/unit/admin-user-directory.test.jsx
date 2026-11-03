import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminUserDirectory } from '../../src/features/users/admin-user-directory.jsx';

afterEach(() => vi.unstubAllGlobals());

describe('owner user directory', () => {
  it('renders a registered account with its role without exposing credentials', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        page: 1, limit: 20, total: 1, pages: 1,
        users: [{
          id: 'u1', email: 'person@example.test', status: 'ACTIVE',
          verified: true, createdAt: '2026-11-03T00:00:00.000Z',
          roles: ['USER'],
        }],
      }),
    })));
    render(<AdminUserDirectory />);
    expect(await screen.findByText('person@example.test')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText(/1 registered account/)).toBeInTheDocument();
  });

  it('shows authorization errors instead of a misleading empty list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Platform Owner access required.' }),
    })));
    render(<AdminUserDirectory />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Platform Owner access required.');
  });
});
