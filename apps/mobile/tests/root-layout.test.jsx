import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { ErrorBoundary, unstable_settings } from '../src/app/_layout.jsx';

describe('mobile root layout recovery', () => {
  it('configures one recovery boundary for nested route screens', () => {
    expect(unstable_settings.screenErrorBoundary).toBe(ErrorBoundary);
  });

  it('shows a safe accessible fallback and retries without exposing diagnostics', () => {
    const retry = jest.fn();
    const { getByRole, queryByText } = render(
      <ErrorBoundary error={new Error('private native stack details')} retry={retry} />,
    );

    expect(getByRole('alert')).toBeTruthy();
    expect(getByRole('header', { name: 'Something went wrong' })).toBeTruthy();
    expect(queryByText(/private native stack details/i)).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Try again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
