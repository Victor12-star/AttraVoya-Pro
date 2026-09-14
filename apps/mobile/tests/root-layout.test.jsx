import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { ErrorBoundary, unstable_settings } from '../src/app/_layout.jsx';

describe('mobile root layout recovery', () => {
  it('configures one recovery boundary for nested route screens', () => {
    expect(unstable_settings.screenErrorBoundary).toBe(ErrorBoundary);
  });

  it('shows a safe accessible fallback and retries without exposing diagnostics', async () => {
    const retry = jest.fn();
    const { getByText, queryByText } = await render(
      <ErrorBoundary error={new Error('private native stack details')} retry={retry} />,
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(queryByText(/private native stack details/i)).toBeNull();

    fireEvent.press(getByText('Try again'));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
