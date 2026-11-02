import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsDashboard } from '../../src/features/dashboard/analytics-dashboard.jsx';

function summary(days, totalRegistered, newRegistered, previousRegistered = 100) {
  return {
    window: {
      days,
      start: '2026-09-06T12:00:00.000Z',
      end: '2026-10-06T12:00:00.000Z',
    },
    users: {
      totalRegistered,
      newRegistered,
      previousRegistered,
      recentlyLoggedIn: 81,
      tripsCreated: 39,
      uniqueTripCreators: 17,
      recordedActiveUsers: 32,
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
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByText('39')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText(/not daily active users/i)).toBeInTheDocument();
    expect(screen.getByText('1.0%')).toBeInTheDocument();
    expect(screen.getByText('26.0%')).toBeInTheDocument();
    expect(screen.getByText('0.1%')).toBeInTheDocument();
    expect(screen.getByText('2.3')).toBeInTheDocument();
    expect(screen.getByText(/aggregate registration metrics/i)).toBeInTheDocument();
    expect(client.getUserAnalytics).toHaveBeenCalledWith({ days: 7 });
  });

  it('shows no registration share when no users are registered', async () => {
    const client = { getUserAnalytics: vi.fn().mockResolvedValue(summary(7, 0, 0)) };
    render(<AnalyticsDashboard client={client} />);
    expect((await screen.findAllByText('—')).length).toBeGreaterThan(0);
  });

  it('shows no trips-per-creator average when no travelers create trips', async () => {
    const data = summary(7, 100, 5);
    data.users.uniqueTripCreators = 0;
    data.users.tripsCreated = 0;
    const client = { getUserAnalytics: vi.fn().mockResolvedValue(data) };
    render(<AnalyticsDashboard client={client} />);
    expect(await screen.findByText('Average saved trips per trip creator')).toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
    expect(screen.queryByText('Infinity')).not.toBeInTheDocument();
  });

  it('does not imply a percentage trend when prior registrations are zero', async () => {
    const client = { getUserAnalytics: vi.fn().mockResolvedValue(summary(7, 15, 3, 0)) };
    render(<AnalyticsDashboard client={client} />);
    expect(await screen.findByText('No comparable percentage')).toBeInTheDocument();
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
    expect(await screen.findAllByText('100')).toHaveLength(2);

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
