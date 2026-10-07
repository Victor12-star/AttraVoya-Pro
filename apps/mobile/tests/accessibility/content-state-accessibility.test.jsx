import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import ContentState from '../../src/components/feedback/content-state.jsx';

describe('mobile content-state accessibility', () => {
  it('announces loading state politely with a labelled progress indicator', async () => {
    const { getByLabelText, getByRole } = await render(<ContentState kind="loading" />);

    const region = getByRole('progressbar');
    expect(region.props.accessibilityLiveRegion).toBe('polite');
    expect(getByLabelText('Loading content')).toBeTruthy();
    expect(getByRole('header', { name: 'Loading' })).toBeTruthy();
  }, 20_000);

  it('announces recoverable errors assertively and exposes an accessible retry button', async () => {
    const retry = jest.fn();
    const { getByRole } = await render(
      <ContentState actionLabel="Try again" kind="offline" onAction={retry} />,
    );

    const region = getByRole('alert');
    expect(region.props.accessibilityLiveRegion).toBe('assertive');

    const button = getByRole('button', { name: 'Try again' });
    expect(button.props.accessibilityHint).toBe('Attempts the operation again');

    fireEvent.press(button);
    expect(retry).toHaveBeenCalledTimes(1);
  }, 20_000);

  it('does not expose an action when no retry handler is available', async () => {
    const { getByRole, queryByRole } = await render(<ContentState kind="error" />);

    expect(getByRole('alert')).toBeTruthy();
    expect(getByRole('header', { name: 'This information is unavailable' })).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  }, 20_000);
});
