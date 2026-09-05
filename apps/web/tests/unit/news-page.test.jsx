import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getNews: vi.fn() }));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: { getNews: mocks.getNews },
}));

const { NewsDestinationPage } = await import('../../src/features/destinations/news-page.jsx');

const messages = {
  common: { loading: 'Loading…', unavailable: 'Temporarily unavailable', retry: 'Retry' },
  home: { exploreCta: 'Explore destinations' },
};

const destination = {
  provider: 'geoapify',
  externalId: 'place-stockholm',
  name: 'Stockholm',
  state: 'Stockholm County',
  countryCode: 'SE',
  countryDisplayName: 'Sweden',
  latitude: 59.3293,
  longitude: 18.0686,
  timeZone: 'Europe/Stockholm',
  slug: 'stockholm-se',
};

function newsResponse(overrides = {}) {
  return {
    news: {
      provider: 'newsdata',
      fetchedAt: '2026-09-05T08:00:00.000Z',
      realtimeGuaranteed: false,
      articles: [
        {
          provider: 'newsdata',
          externalId: 'article-1',
          title: 'Stockholm travel update',
          description: 'A factual provider description about Stockholm travel.',
          url: 'https://example.com/stockholm-travel-update',
          publishedAt: '2026-09-05T07:30:00.000Z',
          countries: ['SE'],
          categories: ['tourism'],
          duplicate: false,
          rating: '5 stars',
          safetyScore: 'Very safe',
          source: { name: 'Example News' },
        },
      ],
      page: { totalResults: 1, nextPage: null },
      ...overrides,
    },
  };
}

describe('NewsDestinationPage', () => {
  beforeEach(() => {
    mocks.getNews.mockReset();
    mocks.getNews.mockResolvedValue(newsResponse());
  });

  it('loads destination news through the shared API contract and renders factual provider fields', async () => {
    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'News about Stockholm', level: 1 })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Stockholm travel update', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('A factual provider description about Stockholm travel.')).toBeInTheDocument();
    expect(screen.getByText('Example News')).toBeInTheDocument();
    expect(screen.getByText('tourism')).toBeInTheDocument();
    expect(screen.getByText('Provider results may be delayed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'href',
      'https://example.com/stockholm-travel-update',
    );
    expect(screen.queryByText('5 stars')).not.toBeInTheDocument();
    expect(screen.queryByText('Very safe')).not.toBeInTheDocument();

    expect(mocks.getNews).toHaveBeenCalledWith({
      query: 'Stockholm',
      countryCode: 'SE',
      language: 'en',
      size: 10,
    });
  });

  it('rejects definite country mismatches, duplicate rows and unsafe article URLs', async () => {
    mocks.getNews.mockResolvedValue(
      newsResponse({
        articles: [
          {
            provider: 'newsdata',
            externalId: 'wrong-country',
            title: 'Wrong country article',
            url: 'https://example.com/wrong',
            countries: ['US'],
            categories: [],
            duplicate: false,
            source: { name: 'Other Source' },
          },
          {
            provider: 'newsdata',
            externalId: 'duplicate',
            title: 'Duplicate article',
            url: 'https://example.com/duplicate',
            countries: ['SE'],
            categories: [],
            duplicate: true,
            source: { name: 'Duplicate Source' },
          },
          {
            provider: 'newsdata',
            externalId: 'safe-row',
            title: 'Safe rendered article',
            url: 'javascript:alert(1)',
            countries: ['SE'],
            categories: ['travel'],
            duplicate: false,
            source: { name: 'Safe Source' },
          },
        ],
      }),
    );

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Safe rendered article', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Wrong country article')).not.toBeInTheDocument();
    expect(screen.queryByText('Duplicate article')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Read article' })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when the provider returns no matching articles', async () => {
    mocks.getNews.mockResolvedValue(newsResponse({ articles: [] }));

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No matching news articles were returned for this destination.'),
    ).toBeInTheDocument();
  });

  it('keeps provider errors private and exposes a working retry', async () => {
    mocks.getNews
      .mockRejectedValueOnce(new Error('provider internals must not leak'))
      .mockResolvedValueOnce(newsResponse());

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(await screen.findByText('News could not be loaded right now.')).toBeInTheDocument();
    expect(screen.queryByText(/provider internals/i)).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNews).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'Stockholm travel update', level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders an invalid destination state without calling the provider', () => {
    render(<NewsDestinationPage destination={null} locale="en" messages={messages} />);

    expect(screen.getByRole('heading', { name: 'Temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute(
      'href',
      '/destinations',
    );
    expect(mocks.getNews).not.toHaveBeenCalled();
  });
});
