import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { LoginForm, normalizeLoginInput } from '../src/app/auth/login.jsx';

describe('mobile login screen', () => {
  it('validates credentials before starting a network request', async () => {
    const onLogin = jest.fn();
    const { getByText } = await render(<LoginForm onLogin={onLogin} />);

    fireEvent.press(getByText('Sign in securely'));

    await waitFor(() =>
      expect(getByText('Enter a valid email address and password.')).toBeTruthy(),
    );
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('normalizes valid input before authentication', () => {
    expect(normalizeLoginInput(' TRAVELLER@EXAMPLE.TEST ', 'Password123')).toEqual({
      email: 'traveller@example.test',
      password: 'Password123',
    });
  });

  it('rejects malformed credentials without returning partial values', () => {
    expect(normalizeLoginInput('not-an-email', 'Password123')).toBeNull();
    expect(normalizeLoginInput('user@example.test', '')).toBeNull();
  });
});
