import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listAuthSessions: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { listAuthSessions: mocks.listAuthSessions },
}));

const { SiteHeader } = await import('../../src/components/navigation/site-header.jsx');

const messages = {
  navigation: {
    explore: 'Explore',
    flights: 'Flights',
    stays: 'Stays',
    thingsToDo: 'Things to do',
    trips: 'Trips',
    signIn: 'Sign in',
    nearby: 'Nearby',
  },
  common: { chooseLanguage: 'Language', chooseCurrency: 'Currency' },
};

describe('SiteHeader session navigation', () => {
  beforeEach(() => {
    mocks.listAuthSessions.mockReset();
    mocks.refresh.mockReset();
  });

  it('shows the account link only after the session endpoint succeeds', async () => {
    mocks.listAuthSessions.mockResolvedValue({ sessions: [] });
    render(<SiteHeader locale="en" messages={messages} />);
    expect(await screen.findByRole('link', { name: 'Account' })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('retains sign-in navigation if the browser cannot authenticate', async () => {
    mocks.listAuthSessions.mockRejectedValue({ status: 401 });
    render(<SiteHeader locale="en" messages={messages} />);
    await waitFor(() => expect(mocks.listAuthSessions).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('rechecks session state after login announces an authentication change', async () => {
    mocks.listAuthSessions
      .mockRejectedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ sessions: [] });
    render(<SiteHeader locale="en" messages={messages} />);
    await waitFor(() => expect(mocks.listAuthSessions).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event('attravoya:auth-changed'));
    expect(await screen.findByRole('link', { name: 'Account' })).toHaveAttribute(
      'href',
      '/profile',
    );
  });
});
