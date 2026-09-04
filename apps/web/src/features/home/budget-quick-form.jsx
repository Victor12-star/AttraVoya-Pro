'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, MapPin, Users, WalletCards } from 'lucide-react';

import { rememberRecentSearch } from '../../lib/recent-searches.js';

export function BudgetQuickForm({ messages, currency = 'EUR' }) {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [budget, setBudget] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');

  function submit(event) {
    event.preventDefault();
    const cleanOrigin = origin.trim();
    const amount = Number(budget);

    if (!cleanOrigin || !Number.isFinite(amount) || amount <= 0) return;

    rememberRecentSearch({
      type: 'BUDGET_TRIP',
      label: `${cleanOrigin} · ${amount} ${currency}`,
      criteria: {
        originLabel: cleanOrigin,
        totalBudget: amount,
        currencyCode: currency,
        adultCount: Number(adults),
        childAges: [],
      },
    });

    const params = new URLSearchParams({
      origin: cleanOrigin,
      budget: String(amount),
      currency,
      adults,
      children,
    });
    router.push(`/plan-by-budget?${params.toString()}`);
  }

  return (
    <form className="budget-quick-form" onSubmit={submit}>
      <label>
        <span>{messages.budget.origin}</span>
        <div className="input-with-icon">
          <MapPin size={18} />
          <input required value={origin} onChange={(event) => setOrigin(event.target.value)} />
        </div>
      </label>
      <label>
        <span>{messages.budget.totalBudget}</span>
        <div className="input-with-icon">
          <WalletCards size={18} />
          <input
            required
            min="1"
            inputMode="decimal"
            type="number"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
          <strong>{currency}</strong>
        </div>
      </label>
      <label>
        <span>{messages.search.travellers}</span>
        <div className="traveller-fields">
          <span>
            <Users size={17} />
            <input
              aria-label={messages.budget.adults}
              min="1"
              max="12"
              type="number"
              value={adults}
              onChange={(event) => setAdults(event.target.value)}
            />
          </span>
          <span>
            <input
              aria-label={messages.budget.children}
              min="0"
              max="12"
              type="number"
              value={children}
              onChange={(event) => setChildren(event.target.value)}
            />
          </span>
        </div>
      </label>
      <button className="button button--dark budget-quick-form__button" type="submit">
        {messages.budget.submit}
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
