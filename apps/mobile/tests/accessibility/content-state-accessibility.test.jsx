import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import ContentState from '../../src/components/feedback/content-state.jsx';

function findNodeByProps(node, expectedProps) {
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findNodeByProps(child, expectedProps);
      if (match) return match;
    }
    return null;
  }

  if (typeof node !== 'object') return null;

  const matches = Object.entries(expectedProps).every(
    ([key, value]) => node.props?.[key] === value,
  );
  if (matches) return node;

  return findNodeByProps(node.children, expectedProps);
}

describe('mobile content-state accessibility', () => {
  it('announces loading state politely with a labelled progress indicator', async () => {
    const view = await render(<ContentState kind="loading" />);

    expect(
      findNodeByProps(view.toJSON(), {
        accessibilityLiveRegion: 'polite',
        accessibilityRole: 'progressbar',
      }),
    ).toBeTruthy();
    expect(view.getByLabelText('Loading content')).toBeTruthy();
    expect(view.getByText('Loading').props.accessibilityRole).toBe('header');
  }, 20_000);

  it('announces recoverable errors assertively and exposes an accessible retry button', async () => {
    const retry = jest.fn();
    const view = await render(
      <ContentState actionLabel="Try again" kind="offline" onAction={retry} />,
    );

    expect(
      findNodeByProps(view.toJSON(), {
        accessibilityLiveRegion: 'assertive',
        accessibilityRole: 'alert',
      }),
    ).toBeTruthy();
    expect(
      findNodeByProps(view.toJSON(), {
        accessibilityHint: 'Attempts the operation again',
        accessibilityRole: 'button',
      }),
    ).toBeTruthy();

    fireEvent.press(view.getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  }, 20_000);

  it('does not expose an action when no retry handler is available', async () => {
    const view = await render(<ContentState kind="error" />);

    expect(
      findNodeByProps(view.toJSON(), {
        accessibilityLiveRegion: 'assertive',
        accessibilityRole: 'alert',
      }),
    ).toBeTruthy();
    expect(view.getByText('This information is unavailable').props.accessibilityRole).toBe(
      'header',
    );
    expect(findNodeByProps(view.toJSON(), { accessibilityRole: 'button' })).toBeNull();
  }, 20_000);
});
