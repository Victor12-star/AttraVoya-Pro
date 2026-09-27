import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import {
  normalizeDeletionConfirmation,
  ProfileContent,
  ProfileDeletionConfirmation,
} from '../src/app/(tabs)/profile.jsx';

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
    expect(result.getByRole('button', { name: 'Delete account' })).toBeTruthy();
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

  it('discloses deletion consequences before collecting confirmation', () => {
    const tree = ProfileDeletionConfirmation({
      confirmation: '',
      isDeleting: false,
      onCancel: jest.fn(),
      onConfirmationChange: jest.fn(),
      onDelete: jest.fn(),
      onPasswordChange: jest.fn(),
      password: '',
    });

    function visit(node, matches = { testIds: new Set(), text: [] }) {
      if (node == null || typeof node === 'boolean') return matches;
      if (typeof node === 'string' || typeof node === 'number') {
        matches.text.push(String(node));
        return matches;
      }
      if (Array.isArray(node)) {
        node.forEach((child) => visit(child, matches));
        return matches;
      }
      if (node?.props?.testID) matches.testIds.add(node.props.testID);
      visit(node?.props?.children, matches);
      return matches;
    }

    const matches = visit(tree);
    const textContent = matches.text.join(' ');

    expect(textContent).toContain('This permanently deletes your trips');
    expect(textContent).toContain('Permanently delete account');
    expect(matches.testIds.has('delete-account-password')).toBe(true);
    expect(matches.testIds.has('delete-account-confirmation')).toBe(true);
  });
});
