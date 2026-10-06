import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsDashboard } from '../../src/features/dashboard/analytics-dashboard.jsx';

function summary(days, totalRegistered, newRegistered) {
  return {
    window: {
      days,
      start: '2026-09-06T12:00:00.000Z',
      end: '2026-10-06T12:00:00.000Z',
    },
    users: {
      totalRegistered,
      newRegistered,
    },
  };
}

describe('admin analytics dashboard', () => {
  it('renders privacy-safe aggregate registration metrics', async () => {
    const client = {
      getUserAnalytics: vi.fn().mockResolvedValue(summary(7, 12430, 126)),
    };

    render(<AnalyticsDashboard client={client} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading analytics');
    expect(await screen.findByText('12,430')).toBeInTheDocument();
    expect(screen.getByText('126')).toBeInTheDocument();
    expect(screen.getByText(/aggregate registration metrics/i)).toBeInTheDocument();
    expect(client.getUserAnalytics).toHaveBeenCalledWith({ days: 7 });
  });

  it('reloads analytics when the administrator changes the reporting window', async () => {
    const user = userEvent.setup();
    const client = {
      getUserAnalytics: vi
        .fn()
        .mockResolvedValueOnce(summary(7, 100, 5))
        .mockResolvedValueOnce(summary(30, 140, 40)),
    };

    render(<AnalyticsDashboard client={client} />);
    await screen.findByText('100');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Analytics window' }), '30');

    expect(await screen.findByText('140')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(client.getUserAnalytics).toHaveBeenLastCalledWith({ days: 30 });
  });

  it('shows a safe error and retries without fabricating analytics', async () => {
    const user = userEvent.setup();
    const client = {
      getUserAnalytics: vi
        .fn()
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce(summary(7, 25, 3)),
    };

    render(<AnalyticsDashboard client={client} />);

    expect(
      await screen.findByText('Analytics are temporarily unavailable. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Total registered users')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(client.getUserAnalytics).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('25')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('explains authorization failures without exposing diagnostics', async () => {
    const client = {
      getUserAnalytics: vi.fn().mockRejectedValue({ status: 403, requestId: 'private-request-id' }),
    };

    render(<AnalyticsDashboard client={client} />);

    expect(
      await screen.findByText('Your account does not have permission to view analytics.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('private-request-id')).not.toBeInTheDocument();
  });
});
