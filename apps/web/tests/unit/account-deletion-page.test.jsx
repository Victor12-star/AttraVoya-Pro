import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listAuthSessions: vi.fn(),
  deleteCurrentAccount: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    listAuthSessions: mocks.listAuthSessions,
    deleteCurrentAccount: mocks.deleteCurrentAccount,
  },
}));

const { AccountDeletionPage, validateDeletionConfirmation } =
  await import('../../src/features/profile/account-deletion-page.jsx');

describe('public account deletion page', () => {
  beforeEach(() => {
    mocks.listAuthSessions.mockReset();
    mocks.deleteCurrentAccount.mockReset();
    mocks.listAuthSessions.mockResolvedValue({ sessions: [] });
    mocks.deleteCurrentAccount.mockResolvedValue(null);
  });

  it('requires an exact confirmation and a policy-valid password', () => {
    expect(validateDeletionConfirmation('password1', 'delete')).toBeNull();
    expect(validateDeletionConfirmation('short1', 'DELETE')).toBeNull();
    expect(validateDeletionConfirmation('password1', 'DELETE')).toBe('password1');
  });

  it('offers a safe sign-in return path when no authenticated session exists', async () => {
    mocks.listAuthSessions.mockRejectedValueOnce({ status: 401, message: 'private detail' });
    render(<AccountDeletionPage />);

    const link = await screen.findByRole('link', { name: 'Sign in to delete account' });
    expect(link).toHaveAttribute('href', '/login?next=%2Fdelete-account');
    expect(screen.queryByText('private detail')).not.toBeInTheDocument();
  });

  it('deletes only after explicit confirmation and shows success after server confirmation', async () => {
    render(<AccountDeletionPage />);
    await screen.findByRole('heading', { name: 'Confirm permanent deletion' });

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'password1' },
    });
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'delete' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete account' }));
    expect(mocks.deleteCurrentAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('type DELETE exactly');

    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete account' }));

    await waitFor(() => expect(mocks.deleteCurrentAccount).toHaveBeenCalledWith('password1'));
    expect(await screen.findByText('Your account has been deleted')).toBeInTheDocument();
  });

  it('keeps the form recoverable and does not expose private server errors', async () => {
    mocks.deleteCurrentAccount.mockRejectedValueOnce({
      status: 500,
      message: 'database connection details',
    });
    render(<AccountDeletionPage />);
    await screen.findByRole('heading', { name: 'Confirm permanent deletion' });

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'password1' },
    });
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your account is unchanged');
    expect(screen.queryByText('database connection details')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Current password')).toHaveValue('password1');
  });
});
