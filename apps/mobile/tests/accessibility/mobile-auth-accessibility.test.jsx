import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { LoginForm } from '../../src/app/auth/login.jsx';
import { RegisterForm } from '../../src/app/auth/register.jsx';

describe('mobile authentication accessibility', () => {
  it('keeps login controls discoverable by role and label', async () => {
    const result = await render(
      <LoginForm onLogin={jest.fn()} onResendVerification={jest.fn()} />,
    );

    expect(result.getByRole('header', { name: 'Welcome back' })).toBeTruthy();
    expect(result.getByLabelText('Email address')).toBeTruthy();
    expect(result.getByLabelText('Password')).toBeTruthy();
    expect(result.getByRole('button', { name: 'Sign in securely' })).toBeTruthy();
    expect(result.getByText('Forgot password?')).toBeTruthy();
    expect(result.getByText('Create an account')).toBeTruthy();
  });

  it('announces login validation errors through a polite live region', async () => {
    const result = await render(
      <LoginForm onLogin={jest.fn()} onResendVerification={jest.fn()} />,
    );

    fireEvent.press(result.getByRole('button', { name: 'Sign in securely' }));

    const error = await result.findByText('Enter a valid email address and password.');
    expect(error.props.accessibilityLiveRegion).toBe('polite');
  });

  it('keeps registration controls and legal links discoverable', async () => {
    const result = await render(
      <RegisterForm
        onOpenPrivacy={jest.fn()}
        onOpenTerms={jest.fn()}
        onRegister={jest.fn()}
      />,
    );

    expect(
      result.getByRole('header', { name: 'Start planning with confidence' }),
    ).toBeTruthy();
    expect(result.getByLabelText('Email address')).toBeTruthy();
    expect(result.getByLabelText('Password')).toBeTruthy();
    expect(result.getByLabelText('Confirm password')).toBeTruthy();
    expect(result.getByRole('button', { name: 'Create account' })).toBeTruthy();
    expect(result.getByRole('link', { name: 'Privacy policy' })).toBeTruthy();
    expect(result.getByRole('link', { name: 'Terms of service' })).toBeTruthy();
  });

  it('announces registration validation errors through a polite live region', async () => {
    const result = await render(
      <RegisterForm
        onOpenPrivacy={jest.fn()}
        onOpenTerms={jest.fn()}
        onRegister={jest.fn()}
      />,
    );

    fireEvent.press(result.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(result.getByText(/use a valid email and a password/i)).toBeTruthy(),
    );
    const error = result.getByText(/use a valid email and a password/i);
    expect(error.props.accessibilityLiveRegion).toBe('polite');
  });
});
