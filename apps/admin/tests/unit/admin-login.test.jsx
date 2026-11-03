import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AdminLoginPage from '../../src/app/login/page.jsx';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => vi.unstubAllGlobals());

describe('admin login', () => {
  it('renders a usable credential form', () => {
    render(<AdminLoginPage />);
    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows a safe error on authentication failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Incorrect credentials or account unavailable.' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AdminLoginPage />);
    await user.type(screen.getByLabelText('Email address'), 'admin@example.test');
    await user.type(screen.getByLabelText('Password'), 'example-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect credentials');
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/login',
        expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
      ),
    );
  });
});
