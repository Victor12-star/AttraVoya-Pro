'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BedDouble, Compass, Plane, Search } from 'lucide-react';

import { rememberRecentSearch } from '../../lib/recent-searches.js';

const TAB_ICONS = {
  explore: Compass,
  flights: Plane,
  stays: BedDouble,
};

export function SearchExperience({ messages }) {
  const router = useRouter();
  const [mode, setMode] = useState('explore');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const tabs = [
    ['explore', messages.navigation.explore],
    ['flights', messages.navigation.flights],
    ['stays', messages.navigation.stays],
  ];

  function submit(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setError(messages.search.destinationQuestion);
      return;
    }

    setError('');
    rememberRecentSearch({ type: 'DESTINATION', label: cleanQuery, criteria: { query: cleanQuery } });
    router.push(`/search?mode=${encodeURIComponent(mode)}&q=${encodeURIComponent(cleanQuery)}`);
  }

  return (
    <div className="travel-search" id="travel-search">
      <div className="travel-search__tabs" role="tablist" aria-label="Travel search type">
        {tabs.map(([id, label]) => {
          const Icon = TAB_ICONS[id];
          return (
            <button
              key={id}
              className={mode === id ? 'is-active' : ''}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </div>

      <form className="travel-search__form" onSubmit={submit} noValidate>
        <label className="travel-search__field">
          <span>{messages.search.destinationQuestion}</span>
          <div className="travel-search__input-wrap">
            <Search size={19} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={messages.search.destinationPlaceholder}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'search-error' : undefined}
            />
          </div>
        </label>
        <button className="button button--accent button--search" type="submit">
          {messages.common.search}
        </button>
      </form>
      {error ? <p className="field-error" id="search-error">{error}</p> : null}
    </div>
  );
}
