import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Stack } from 'expo-router';

import RootLayout, {
  ErrorBoundary,
  unstable_settings,
} from '../src/app/_layout.jsx';

jest.mock('expo-router', () => ({
  Stack: jest.fn(() => null),
}));

describe('mobile root layout recovery', () => {
  it('configures one recovery boundary for nested route screens', () => {
    render(<RootLayout />);

    expect(Stack).toHaveBeenCalled();
    expect(Stack.mock.calls[0][0]).toEqual(
      expect.objectContaining({ screenOptions: { headerShown: false } }),
    );
    expect(unstable_settings.screenErrorBoundary).toBe(ErrorBoundary);
  });

  it('shows a safe accessible fallback and retries without exposing diagnostics', () => {
    const retry = jest.fn();

    render(<ErrorBoundary error={new Error('private native stack details')} retry={retry} />);

    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeOnTheScreen();
    expect(screen.queryByText(/private native stack details/i)).not.toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
