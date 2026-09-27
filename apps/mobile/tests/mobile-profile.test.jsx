import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';

import { normalizeDeletionConfirmation, ProfileContent } from '../src/app/(tabs)/profile.jsx';

describe('mobile profile screen', () => {
  it('renders validated identity and provides an accessible sign-out action', async () => {
    const onLogout = jest.fn(async () => undefined);
    const onDeleteAccount = jest.fn(async () => undefined);
    const result = await render(
      <ProfileContent
        onDeleteAccount={onDeleteAccount}
        onLogout={onLogout}
        user={{
          id: 'user-1',
          email: 'traveller@example.test',
          roles: ['USER'],
          emailVerified: true,
        }}
      />,
    );

    expect(result.getByText('traveller@example.test')).toBeTruthy();
    expect(result.getByText('Verified')).toBeTruthy();
    await fireEvent.press(result.getByText('Sign out securely'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('fails safely when identity is unavailable', async () => {
    const result = await render(
      <ProfileContent onDeleteAccount={jest.fn()} onLogout={jest.fn()} user={null} />,
    );

    expect(result.getByText('Account details unavailable')).toBeTruthy();
    expect(result.queryByText('Sign out securely')).toBeNull();
  });

  it('requires a valid password and an exact destructive confirmation', () => {
    expect(normalizeDeletionConfirmation('password1', 'delete')).toBeNull();
    expect(normalizeDeletionConfirmation('short1', 'DELETE')).toBeNull();
    expect(normalizeDeletionConfirmation('password1', 'DELETE')).toBe('password1');
  });

  it('discloses deletion consequences before collecting confirmation', async () => {
    const result = await render(
      <ProfileContent
        onDeleteAccount={jest.fn()}
        onLogout={jest.fn()}
        user={{
          id: 'user-1',
          email: 'traveller@example.test',
          roles: ['USER'],
          emailVerified: true,
        }}
      />,
    );

    expect(result.queryByText(/This permanently deletes your trips/)).toBeNull();
    act(() => {
      fireEvent.press(result.getByRole('button', { name: 'Delete account' }));
    });
    expect(result.getByText(/This permanently deletes your trips/)).toBeTruthy();
    expect(result.getByTestId('delete-account-password')).toBeTruthy();
    expect(result.getByTestId('delete-account-confirmation')).toBeTruthy();
  });
});
