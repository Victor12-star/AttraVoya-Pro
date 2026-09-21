import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import {
  ForgotPasswordForm,
  normalizePasswordResetRequest,
  PasswordResetRequestSuccess,
} from '../src/app/auth/forgot-password.jsx';

describe('mobile forgot-password screen', () => {
  it('normalizes valid email and rejects malformed input', () => {
    expect(normalizePasswordResetRequest(' TRAVELLER@EXAMPLE.TEST ')).toBe(
      'traveller@example.test',
    );
    expect(normalizePasswordResetRequest(null)).toBeNull();
  });

  it('validates malformed input before making a request', async () => {
    const onRequestPasswordReset = jest.fn();
    const { getByText } = await render(
      <ForgotPasswordForm onRequestPasswordReset={onRequestPasswordReset} />,
    );

    fireEvent.press(getByText('Send reset instructions'));

    await waitFor(() => expect(getByText(/enter a valid email address/i)).toBeTruthy());
    expect(onRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('uses an enumeration-safe success state and explains the secure web handoff', async () => {
    const result = await render(<PasswordResetRequestSuccess />);

    expect(result.getByText(/if an account exists/i)).toBeTruthy();
    expect(result.getByText(/opens on the AttraVoya website/i)).toBeTruthy();
    expect(result.queryByText(/account was found/i)).toBeNull();
  });
});
