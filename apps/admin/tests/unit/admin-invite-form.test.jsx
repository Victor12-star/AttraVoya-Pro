import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminInviteForm } from '../../src/features/users/admin-invite-form.jsx';

afterEach(() => vi.unstubAllGlobals());

describe('owner registration invitation', () => {
  it('renders the invited email and owner verification controls', () => {
    render(<AdminInviteForm />);
    expect(screen.getByRole('textbox', { name: 'Administrator email address' })).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm your owner password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Send administrator registration invitation' })).toBeInTheDocument();
    expect(screen.getByText(/does not grant administrator privileges/i)).toBeInTheDocument();
  });

  it('shows a separate-registration confirmation instead of claiming role assignment', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sent: true, requiresRegistrationAndOwnerApproval: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AdminInviteForm />);
    await user.type(screen.getByLabelText('Administrator email address'), 'person@example.test');
    await user.type(screen.getByLabelText('Confirm your owner password'), 'SecretPassword123');
    await user.click(screen.getByRole('button', { name: 'Send administrator registration invitation' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Once the person verifies their account');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/invitations',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    ));
  });
});
