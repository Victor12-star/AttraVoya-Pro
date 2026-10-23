import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { LoginForm } from '../../src/app/auth/login.jsx';
import ScaffoldScreen from '../../src/components/common/scaffold-screen.jsx';

describe('mobile accessibility baseline', () => {
  it('exposes the login heading, labelled fields, and secure sign-in action', async () => {
    const { getByLabelText, getByRole } = await render(
      <LoginForm onLogin={jest.fn()} onResendVerification={jest.fn()} />,
    );

    expect(getByRole('header', { name: 'Welcome back' })).toBeTruthy();
    expect(getByLabelText('Email address')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
    expect(getByRole('button', { name: 'Sign in securely' })).toBeTruthy();
  });

  it('announces validation errors through a polite live region', async () => {
    const { getByRole, getByText } = await render(
      <LoginForm onLogin={jest.fn()} onResendVerification={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'Sign in securely' }));

    await waitFor(() => {
      expect(getByText('Enter a valid email address and password.')).toHaveProp(
        'accessibilityLiveRegion',
        'polite',
      );
    });
  });

  it('exposes scaffold status and page title semantics', async () => {
    const { getByRole } = await render(
      <ScaffoldScreen
        description="Verified travel information will appear here when available."
        eyebrow="Explore"
        title="Explore with confidence"
      />,
    );

    expect(getByRole('summary')).toBeTruthy();
    expect(getByRole('header', { name: 'Explore with confidence' })).toBeTruthy();
  }, 20_000);
});
