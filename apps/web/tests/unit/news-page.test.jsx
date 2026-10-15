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
          publishedAt: '2026-09-05 07:30:00',
          publishedAtUtc: '2026-09-05T07:30:00.000Z',
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

    expect(
      screen.getByRole('heading', { name: 'News about Stockholm', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Stockholm travel update', level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('A factual provider description about Stockholm travel.'),
    ).toBeInTheDocument();
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

  it('does not display raw provider dates without a validated UTC publication time', async () => {
    mocks.getNews.mockResolvedValue(
      newsResponse({
        articles: [
          {
            provider: 'newsdata',
            externalId: 'unknown-time',
            title: 'Undated destination update',
            publishedAt: '2026-09-05 07:30:00',
            publishedAtUtc: null,
            countries: ['SE'],
            source: { name: 'Example News' },
          },
        ],
      }),
    );

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Undated destination update', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Publication time unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Published:/)).not.toBeInTheDocument();
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

  it('does not link to credential-bearing or local HTTPS news URLs', async () => {
    mocks.getNews.mockResolvedValue(
      newsResponse({
        articles: [
          {
            provider: 'newsdata',
            externalId: 'credentials',
            title: 'Credential URL',
            url: 'https://user:secret@example.com/story',
            countries: ['SE'],
          },
          {
            provider: 'newsdata',
            externalId: 'localhost',
            title: 'Local URL',
            url: 'https://localhost./internal',
            countries: ['SE'],
          },
          {
            provider: 'newsdata',
            externalId: 'private-domain',
            title: 'Local domain URL',
            url: 'https://news.local/story',
            countries: ['SE'],
          },
          {
            provider: 'newsdata',
            externalId: 'intranet-host',
            title: 'Intranet host URL',
            url: 'https://intranet/story',
            countries: ['SE'],
          },
          {
            provider: 'newsdata',
            externalId: 'public',
            title: 'Public URL',
            url: 'https://example.com/public-story',
            countries: ['SE'],
          },
        ],
      }),
    );

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Public URL', level: 3 }),
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Read article' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.com/public-story');
  });

  it('does not link directly to IPv4 or IPv6 article hosts', async () => {
    mocks.getNews.mockResolvedValue(
      newsResponse({
        articles: [
          {
            provider: 'newsdata',
            externalId: 'ipv4-loopback',
            title: 'Loopback address article',
            url: 'https://127.0.0.1/story',
            countries: ['SE'],
          },
          {
            provider: 'newsdata',
            externalId: 'ipv4-private',
            title: 'Private address article',
            url: 'https://192.168.1.5/story',
            countries: ['SE'],
          },
          {
            provider: 'newsdata',
            externalId: 'ipv6-loopback',
            title: 'IPv6 address article',
            url: 'https://[::1]/story',
            countries: ['SE'],
          },
          {
            provider: 'newsdata',
            externalId: 'public',
            title: 'Public article',
            url: 'https://example.com/public-story',
            countries: ['SE'],
          },
        ],
      }),
    );

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);
    expect(
      await screen.findByRole('heading', { name: 'Public article', level: 3 }),
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Read article' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.com/public-story');
  });

  it('excludes articles that the backend explicitly marks as unrelated to the destination', async () => {
    mocks.getNews.mockResolvedValue(
      newsResponse({
        articles: [
          {
            provider: 'newsdata',
            externalId: 'wrong-country-name',
            title: 'Unrelated country news',
            countries: ['norway'],
            countryRelevance: 'country_not_listed',
          },
          {
            provider: 'newsdata',
            externalId: 'matching-country-name',
            title: 'Relevant Sweden update',
            countries: ['sweden'],
            countryRelevance: 'country_match',
          },
        ],
      }),
    );

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByRole('heading', { name: 'Relevant Sweden update', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Unrelated country news')).not.toBeInTheDocument();
  });

  it('shows an honest empty state when the provider returns no matching articles', async () => {
    mocks.getNews.mockResolvedValue(newsResponse({ articles: [] }));

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('No matching news articles were returned for this destination.'),
    ).toBeInTheDocument();
  });

  it('discloses additional news pages without implying complete coverage', async () => {
    mocks.getNews.mockResolvedValue(newsResponse({ additionalPagesAvailable: true }));

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('More pages are available. This list may be incomplete.'),
    ).toBeInTheDocument();
  });

  it('discloses additional pages even when the current page has no matching articles', async () => {
    mocks.getNews.mockResolvedValue(newsResponse({ articles: [], additionalPagesAvailable: true }));

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);

    expect(
      await screen.findByText('More pages are available. This list may be incomplete.'),
    ).toBeInTheDocument();
  });

  it('refreshes successful news results on request', async () => {
    mocks.getNews
      .mockResolvedValueOnce(newsResponse())
      .mockResolvedValueOnce(newsResponse({ articles: [] }));

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);
    expect(
      await screen.findByRole('heading', { name: 'Stockholm travel update', level: 3 }),
    ).toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(
      await screen.findByText('No matching news articles were returned for this destination.'),
    ).toBeInTheDocument();
    expect(mocks.getNews).toHaveBeenCalledTimes(2);
  });

  it('refreshes an empty news result without requiring an error', async () => {
    mocks.getNews
      .mockResolvedValueOnce(newsResponse({ articles: [] }))
      .mockResolvedValueOnce(newsResponse());

    render(<NewsDestinationPage destination={destination} locale="en" messages={messages} />);
    expect(
      await screen.findByText('No matching news articles were returned for this destination.'),
    ).toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(
      await screen.findByRole('heading', { name: 'Stockholm travel update', level: 3 }),
    ).toBeInTheDocument();
    expect(mocks.getNews).toHaveBeenCalledTimes(2);
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

  it('ignores a stale retry response after switching destinations', async () => {
    let resolveRetry;
    const pendingRetry = new Promise((resolve) => {
      resolveRetry = resolve;
    });
    mocks.getNews
      .mockRejectedValueOnce(new Error('temporary provider error'))
      .mockImplementationOnce(() => pendingRetry)
      .mockResolvedValueOnce(
        newsResponse({
          articles: [
            {
              provider: 'newsdata',
              externalId: 'new-destination',
              title: 'Oslo destination update',
              countries: ['NO'],
            },
          ],
        }),
      );

    const { rerender } = render(
      <NewsDestinationPage destination={destination} locale="en" messages={messages} />,
    );
    expect(await screen.findByText('News could not be loaded right now.')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => expect(mocks.getNews).toHaveBeenCalledTimes(2));

    const oslo = { ...destination, name: 'Oslo', countryCode: 'NO', slug: 'oslo-no' };
    rerender(<NewsDestinationPage destination={oslo} locale="en" messages={messages} />);
    expect(
      await screen.findByRole('heading', { name: 'Oslo destination update', level: 3 }),
    ).toBeInTheDocument();

    resolveRetry(newsResponse());
    await waitFor(() => expect(mocks.getNews).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('heading', { name: 'Oslo destination update' })).toBeInTheDocument();
    expect(screen.queryByText('Stockholm travel update')).not.toBeInTheDocument();
  });

  it('hides previous destination articles while the new destination is loading', async () => {
    let resolveOslo;
    const pendingOslo = new Promise((resolve) => {
      resolveOslo = resolve;
    });
    mocks.getNews.mockResolvedValueOnce(newsResponse()).mockImplementationOnce(() => pendingOslo);

    const { rerender } = render(
      <NewsDestinationPage destination={destination} locale="en" messages={messages} />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Stockholm travel update', level: 3 }),
    ).toBeInTheDocument();

    const oslo = { ...destination, name: 'Oslo', countryCode: 'NO', slug: 'oslo-no' };
    rerender(<NewsDestinationPage destination={oslo} locale="en" messages={messages} />);

    expect(screen.queryByText('Stockholm travel update')).not.toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();

    resolveOslo(
      newsResponse({
        articles: [
          {
            provider: 'newsdata',
            externalId: 'oslo-story',
            title: 'Oslo travel update',
            countries: ['NO'],
          },
        ],
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Oslo travel update', level: 3 }),
    ).toBeInTheDocument();
  });

  it('hides prior news when different places share a name and country', async () => {
    let resolveSecond;
    const secondResult = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    mocks.getNews.mockResolvedValueOnce(newsResponse()).mockImplementationOnce(() => secondResult);

    const { rerender } = render(
      <NewsDestinationPage destination={destination} locale="en" messages={messages} />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Stockholm travel update', level: 3 }),
    ).toBeInTheDocument();

    const distinctPlace = {
      ...destination,
      externalId: 'different-stockholm-place',
      latitude: 59.34,
      longitude: 18.07,
    };
    rerender(<NewsDestinationPage destination={distinctPlace} locale="en" messages={messages} />);

    expect(screen.queryByText('Stockholm travel update')).not.toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();

    resolveSecond(newsResponse({ articles: [] }));
    expect(
      await screen.findByText('No matching news articles were returned for this destination.'),
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
