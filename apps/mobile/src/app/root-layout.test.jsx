import { fireEvent, render, screen } from '@testing-library/react-native';
import { Stack } from 'expo-router';
jest.mock('expo-router', () => ({
  Stack: jest.fn(() => null),
}));

const { default: RootLayout, ErrorBoundary, unstable_settings } = await import('./_layout.jsx');

describe('mobile root layout recovery', () => {
  it('configures one recovery boundary for nested route screens', () => {
    render(<RootLayout />);

    expect(Stack).toHaveBeenCalledWith(
      expect.objectContaining({ screenOptions: { headerShown: false } }),
      undefined,
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
