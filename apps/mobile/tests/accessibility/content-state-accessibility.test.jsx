import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import ContentState from '../../src/components/feedback/content-state.jsx';

describe('mobile content-state accessibility', () => {
  it('announces loading state politely with a labelled progress indicator', async () => {
    const { getByLabelText, getByText, UNSAFE_getByProps } = await render(
      <ContentState kind="loading" />,
    );

    const region = UNSAFE_getByProps({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'progressbar',
    });
    expect(region).toBeTruthy();
    expect(getByLabelText('Loading content')).toBeTruthy();
    expect(getByText('Loading').props.accessibilityRole).toBe('header');
  }, 20_000);

  it('announces recoverable errors assertively and exposes an accessible retry button', async () => {
    const retry = jest.fn();
    const { UNSAFE_getByProps } = await render(
      <ContentState actionLabel="Try again" kind="offline" onAction={retry} />,
    );

    const region = UNSAFE_getByProps({
      accessibilityLiveRegion: 'assertive',
      accessibilityRole: 'alert',
    });
    expect(region).toBeTruthy();

    const button = UNSAFE_getByProps({
      accessibilityHint: 'Attempts the operation again',
      accessibilityRole: 'button',
    });
    fireEvent.press(button);

    expect(retry).toHaveBeenCalledTimes(1);
  }, 20_000);

  it('does not expose an action when no retry handler is available', async () => {
    const { getByText, UNSAFE_getByProps, UNSAFE_queryByProps } = await render(
      <ContentState kind="error" />,
    );

    expect(
      UNSAFE_getByProps({
        accessibilityLiveRegion: 'assertive',
        accessibilityRole: 'alert',
      }),
    ).toBeTruthy();
    expect(getByText('This information is unavailable').props.accessibilityRole).toBe('header');
    expect(UNSAFE_queryByProps({ accessibilityRole: 'button' })).toBeNull();
  }, 20_000);
});
