import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import ContentState from '../src/components/feedback/content-state.jsx';

describe('mobile content feedback states', () => {
  it('shows a recoverable offline message and invokes retry once', async () => {
    const retry = jest.fn();
    const { getByText } = await render(
      <ContentState actionLabel="Try again" kind="offline" onAction={retry} />,
    );

    expect(getByText('You appear to be offline')).toBeTruthy();
    expect(getByText(/saved information remains available/i)).toBeTruthy();

    fireEvent.press(getByText('Try again'));

    expect(retry).toHaveBeenCalledTimes(1);
  }, 20_000);

  it('shows an empty state without rendering an unusable action', async () => {
    const { getByText, queryByRole } = await render(<ContentState kind="empty" />);

    expect(getByText('Nothing here yet')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  }, 20_000);
});
