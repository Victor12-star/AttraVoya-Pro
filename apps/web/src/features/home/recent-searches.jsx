'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Clock3 } from 'lucide-react';

import { clearRecentSearches, getRecentSearches } from '../../lib/recent-searches.js';

function getSearchHref(search) {
  if (search.type === 'BUDGET_TRIP') {
    const criteria = search.criteria ?? {};
    const params = new URLSearchParams();
    if (criteria.originLabel) params.set('origin', criteria.originLabel);
    if (criteria.totalBudget) params.set('budget', String(criteria.totalBudget));
    if (criteria.currencyCode) params.set('currency', criteria.currencyCode);
    return `/plan-by-budget?${params.toString()}`;
  }

  return `/search?q=${encodeURIComponent(search.criteria?.query ?? search.label)}`;
}

export function RecentSearches({ messages }) {
  const router = useRouter();
  const [searches, setSearches] = useState([]);

  useEffect(() => {
    setSearches(getRecentSearches());
  }, []);

  if (searches.length === 0) return null;

  return (
    <div className="recent-searches" aria-label={messages.recentSearches}>
      <div className="recent-searches__top">
        <span><Clock3 size={15} /> {messages.recentSearches}</span>
        <button
          type="button"
          onClick={() => {
            clearRecentSearches();
            setSearches([]);
          }}
        >
          {messages.clear}
        </button>
      </div>
      <div className="recent-searches__items">
        {searches.slice(0, 4).map((search) => (
          <button key={search.id} type="button" onClick={() => router.push(getSearchHref(search))}>
            {search.label}
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
