import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchDestinations = vi.fn();
const rememberRecentSearch = vi.fn();

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    searchDestinations,
  },
}));

vi.mock('../../src/lib/recent-searches.js', () => ({
  rememberRecentSearch,
}));

const { DestinationSearch } = await import(
  '../../src/features/destinations/destination-search.jsx'
);

const messages = {
  navigation: { explore: 'Explore' },
  home: { exploreCta: 'Explore destinations' },
  search: {
    destinationQuestion: 'Where do you want to go?',
    destinationPlaceholder: 'Search cities, countries and destinations',
  },
  common: {
    search: 'Search',
    loading: 'Loading…',
    unavailable: 'Temporarily unavailable',
    retry: 'Retry',
  },
};

function destination(name = 'Stockholm') {
  return {
    provider: 'geoapify',
    externalId: `geo-${name.toLowerCase()}`,
    name,
    state: 'Stockholm County',
    country: 'Sweden',
    countryCode: 'SE',
    latitude: 59.3293,
    longitude: 18.0686,
  };
}

describe('DestinationSearch', () => {
  beforeEach(() => {
    searchDestinations.mockReset();
    rememberRecentSearch.mockReset();
  });

  it('loads real destination results for an initial explore query and supports selection', async () => {
    searchDestinations.mockResolvedValue({
      destinations: { results: [destination()] },
    });

    render(<DestinationSearch initialQuery="Stockholm" locale="en" messages={messages} />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    const result = await screen.findByRole('button', { name: /Stockholm/i });
    expect(searchDestinations).toHaveBeenCalledWith({
      query: 'Stockholm',
      language: 'en',
      limit: 8,
    });

    fireEvent.click(result);
    expect(result).toHaveAttribute('aria-pressed', 'true');
    expect(rememberRecentSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DESTINATION',
        criteria: expect.objectContaining({
          query: 'Stockholm',
          countryCode: 'SE',
          destinationId: 'geo-stockholm',
        }),
      }),
    );
  });

  it('shows a safe provider error and retries the same query', async () => {
    searchDestinations
      .mockRejectedValueOnce(new Error('provider details must not be rendered'))
      .mockResolvedValueOnce({ destinations: { results: [destination('Paris')] } });

    render(<DestinationSearch initialQuery="Paris" locale="en" messages={messages} />);

    expect(await screen.findByText('Temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/provider details/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: /Paris/i })).toBeInTheDocument();
    expect(searchDestinations).toHaveBeenCalledTimes(2);
  });

  it('renders an explicit empty state when the provider returns no destinations', async () => {
    searchDestinations.mockResolvedValue({ destinations: { results: [] } });

    render(<DestinationSearch initialQuery="zz" locale="en" messages={messages} />);

    await waitFor(() => expect(searchDestinations).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText('Search cities, countries and destinations', { selector: 'strong' }),
    ).toBeInTheDocument();
    expect(screen.getByText('zz')).toBeInTheDocument();
  });

  it('validates short queries before calling the backend', () => {
    render(<DestinationSearch locale="en" messages={messages} />);

    const input = screen.getByPlaceholderText('Search cities, countries and destinations');
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.submit(input.closest('form'));

    expect(searchDestinations).not.toHaveBeenCalled();
    expect(screen.getByText('Where do you want to go?', { selector: '.field-error' })).toBeVisible();
  });
});
