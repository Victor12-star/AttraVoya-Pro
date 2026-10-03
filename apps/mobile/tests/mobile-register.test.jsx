import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import {
  normalizeRegistrationInput,
  RegistrationSuccess,
  RegisterForm,
} from '../src/app/auth/register.jsx';

describe('mobile registration screen', () => {
  it('normalizes valid registration input and rejects password mismatches', () => {
    expect(
      normalizeRegistrationInput(' TRAVELLER@EXAMPLE.TEST ', 'Password123', 'Password123'),
    ).toEqual({ email: 'traveller@example.test', password: 'Password123' });
    expect(
      normalizeRegistrationInput('traveller@example.test', 'Password123', 'Different123'),
    ).toBeNull();
  });

  it('validates malformed input before making a request', async () => {
    const onRegister = jest.fn();
    const { getByText } = await render(<RegisterForm onRegister={onRegister} />);

    fireEvent.press(getByText('Create account'));

    await waitFor(() => expect(getByText(/use a valid email/i)).toBeTruthy());
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('exposes privacy and terms before account creation', async () => {
    const onOpenPrivacy = jest.fn(async () => undefined);
    const onOpenTerms = jest.fn(async () => undefined);
    const result = await render(
      <RegisterForm
        onOpenPrivacy={onOpenPrivacy}
        onOpenTerms={onOpenTerms}
        onRegister={jest.fn()}
      />,
    );

    expect(result.getByRole('link', { name: 'Privacy policy' })).toBeTruthy();
    expect(result.getByRole('link', { name: 'Terms of service' })).toBeTruthy();

    await fireEvent.press(result.getByText('Privacy policy'));
    await fireEvent.press(result.getByText('Terms of service'));

    expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
    expect(onOpenTerms).toHaveBeenCalledTimes(1);
  });

  it('contains registration legal-link failures without exposing diagnostics', async () => {
    const result = await render(
      <RegisterForm
        onOpenPrivacy={jest.fn().mockRejectedValue(new Error('private linking detail'))}
        onOpenTerms={jest.fn()}
        onRegister={jest.fn()}
      />,
    );

    await fireEvent.press(result.getByText('Privacy policy'));

    expect(
      await result.findByText('This legal page could not be opened. Please try again.'),
    ).toBeTruthy();
    expect(result.queryByText('private linking detail')).toBeNull();
  });

  it('explains successful verification delivery', async () => {
    const sent = await render(
      <RegistrationSuccess email="user@example.test" verificationDelivery="sent" />,
    );
    expect(sent.getByText(/sent a verification link to user@example\.test/i)).toBeTruthy();
  });

  it('reports degraded verification delivery without claiming an email was sent', async () => {
    const failed = await render(
      <RegistrationSuccess email="user@example.test" verificationDelivery="failed" />,
    );
    expect(failed.getByText(/verification email could not be sent/i)).toBeTruthy();
    expect(failed.queryByText(/we sent a verification link/i)).toBeNull();
  });
});
