import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import WebError from '../../src/app/error.jsx';

describe('customer route error boundary', () => {
  afterEach(() => {
    document.documentElement.lang = 'en';
  });

  it('uses maintained locale copy and retries without exposing diagnostics', async () => {
    document.documentElement.lang = 'sv';
    const reset = vi.fn();

    render(<WebError reset={reset} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tillfälligt otillgängligt' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/stack|provider|request id|token/i)).not.toBeInTheDocument();
  });

  it('renders a safe fallback immediately', () => {
    render(<WebError reset={() => {}} />);

    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
});
