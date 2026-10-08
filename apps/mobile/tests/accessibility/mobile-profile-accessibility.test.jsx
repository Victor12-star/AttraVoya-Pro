import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { ProfileContent } from '../../src/app/(tabs)/profile.jsx';

const user = {
  id: 'user-1',
  email: 'traveller@example.test',
  roles: ['USER'],
  emailVerified: true,
};

function renderProfile(overrides = {}) {
  return render(
    <ProfileContent
      onDeleteAccount={jest.fn()}
      onLogout={jest.fn()}
      onOpenDeleteAccount={jest.fn()}
      onOpenPrivacy={jest.fn()}
      onOpenTerms={jest.fn()}
      user={user}
      {...overrides}
    />,
  );
}

describe('mobile profile accessibility', () => {
  it('keeps account controls discoverable by semantic role', async () => {
    const result = await renderProfile();

    expect(result.getByRole('header', { name: 'Your account' })).toBeTruthy();
    expect(result.getByRole('header', { name: 'Delete account' })).toBeTruthy();
    expect(result.getByRole('link', { name: 'Privacy policy' })).toBeTruthy();
    expect(result.getByRole('link', { name: 'Terms of service' })).toBeTruthy();
    expect(result.getByRole('link', { name: 'Delete account on web' })).toBeTruthy();
    expect(result.getByRole('button', { name: 'Sign out securely' })).toBeTruthy();
    expect(result.getByRole('button', { name: 'Delete account' })).toBeTruthy();
  });

  it('keeps destructive confirmation fields labelled and actions explicit', async () => {
    const result = await renderProfile();

    fireEvent.press(result.getByRole('button', { name: 'Delete account' }));

    expect(result.getByLabelText('Current password')).toBeTruthy();
    expect(result.getByLabelText('Type DELETE to confirm')).toBeTruthy();
    expect(result.getByRole('button', { name: 'Permanently delete account' })).toBeTruthy();
    expect(result.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('announces invalid deletion confirmation through a polite live region', async () => {
    const result = await renderProfile();

    fireEvent.press(result.getByRole('button', { name: 'Delete account' }));
    fireEvent.press(result.getByRole('button', { name: 'Permanently delete account' }));

    const error = await result.findByText(
      'Enter your current password and type DELETE exactly to confirm.',
    );
    expect(error.props.accessibilityLiveRegion).toBe('polite');
  });

  it('announces unavailable account state without exposing private controls', async () => {
    const result = await renderProfile({ user: null });

    const heading = result.getByRole('header', { name: 'Account details unavailable' });
    expect(heading).toBeTruthy();
    expect(heading.parent?.props?.accessibilityLiveRegion).toBe('polite');
    expect(result.queryByRole('button', { name: 'Sign out securely' })).toBeNull();
    expect(result.queryByRole('button', { name: 'Delete account' })).toBeNull();
  });
});
