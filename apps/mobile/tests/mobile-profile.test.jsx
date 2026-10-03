import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import {
  normalizeDeletionConfirmation,
  ProfileContent,
  ProfileDeletionConfirmation,
} from '../src/app/(tabs)/profile.jsx';
import {
  buildConfiguredPublicWebPageUrl,
  normalizePublicWebBaseUrl,
} from '../src/services/public-web-links.js';

describe('mobile profile screen', () => {
  it('renders validated identity and provides an accessible sign-out action', async () => {
    const onLogout = jest.fn(async () => undefined);
    const onDeleteAccount = jest.fn(async () => undefined);
    const onOpenPrivacy = jest.fn(async () => undefined);
    const onOpenTerms = jest.fn(async () => undefined);
    const result = await render(
      <ProfileContent
        onDeleteAccount={onDeleteAccount}
        onLogout={onLogout}
        onOpenPrivacy={onOpenPrivacy}
        onOpenTerms={onOpenTerms}
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
    expect(result.getByRole('link', { name: 'Privacy policy' })).toBeTruthy();
    expect(result.getByRole('link', { name: 'Terms of service' })).toBeTruthy();

    await fireEvent.press(result.getByText('Privacy policy'));
    await fireEvent.press(result.getByText('Terms of service'));
    expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
    expect(onOpenTerms).toHaveBeenCalledTimes(1);

    await fireEvent.press(result.getByText('Sign out securely'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('fails safely when identity is unavailable', async () => {
    const result = await render(
      <ProfileContent
        onDeleteAccount={jest.fn()}
        onLogout={jest.fn()}
        onOpenPrivacy={jest.fn()}
        onOpenTerms={jest.fn()}
        user={null}
      />,
    );

    expect(result.getByText('Account details unavailable')).toBeTruthy();
    expect(result.queryByText('Sign out securely')).toBeNull();
  });

  it('contains legal-link launch failures without exposing diagnostics', async () => {
    const result = await render(
      <ProfileContent
        onDeleteAccount={jest.fn()}
        onLogout={jest.fn()}
        onOpenPrivacy={jest.fn().mockRejectedValue(new Error('private linking detail'))}
        onOpenTerms={jest.fn()}
        user={{
          id: 'user-1',
          email: 'traveller@example.test',
          roles: ['USER'],
          emailVerified: true,
        }}
      />,
    );

    await fireEvent.press(result.getByText('Privacy policy'));

    expect(
      await result.findByText('This legal page could not be opened. Please try again.'),
    ).toBeTruthy();
    expect(result.queryByText('private linking detail')).toBeNull();
  });

  it('restricts public legal links to the configured safe origin', () => {
    const expoConfig = { extra: { webBaseUrl: 'https://attravoya.example' } };

    expect(normalizePublicWebBaseUrl('https://attravoya.example/')).toBe(
      'https://attravoya.example',
    );
    expect(buildConfiguredPublicWebPageUrl('/privacy', expoConfig)).toBe(
      'https://attravoya.example/privacy',
    );
    expect(buildConfiguredPublicWebPageUrl('/terms', expoConfig)).toBe(
      'https://attravoya.example/terms',
    );
    expect(() => buildConfiguredPublicWebPageUrl('/admin', expoConfig)).toThrow(
      'mobile public web configuration',
    );
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
