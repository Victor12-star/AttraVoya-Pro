import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { ProfileContent } from '../src/app/(tabs)/profile.jsx';

describe('mobile profile screen', () => {
  it('renders validated identity and provides an accessible sign-out action', async () => {
    const onLogout = jest.fn(async () => undefined);
    const result = await render(
      <ProfileContent
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
    fireEvent.press(result.getByText('Sign out securely'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('fails safely when identity is unavailable', async () => {
    const result = await render(<ProfileContent onLogout={jest.fn()} user={null} />);

    expect(result.getByText('Account details unavailable')).toBeTruthy();
    expect(result.queryByText('Sign out securely')).toBeNull();
  });
});
