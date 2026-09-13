import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  rememberRecentSearch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('../../src/lib/recent-searches.js', () => ({
  rememberRecentSearch: mocks.rememberRecentSearch,
}));

const { BudgetQuickForm } = await import('../../src/features/home/budget-quick-form.jsx');

const messages = {
  budget: {
    origin: 'Origin',
    totalBudget: 'Total budget',
    adults: 'Adults',
    children: 'Children',
    submit: 'Plan by budget',
  },
  search: { travellers: 'Travellers' },
  common: { loading: 'Loading…' },
};

describe('BudgetQuickForm', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.rememberRecentSearch.mockReset();
  });

  it('gives immediate feedback and prevents duplicate navigation', () => {
    render(<BudgetQuickForm messages={messages} currency="SEK" />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Origin' }), {
      target: { value: 'Stockholm' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Total budget SEK' }), {
      target: { value: '10000' },
    });

    const form = screen.getByRole('button', { name: 'Plan by budget' }).closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(form).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled();
    expect(mocks.rememberRecentSearch).toHaveBeenCalledTimes(1);
    expect(mocks.push).toHaveBeenCalledTimes(1);
    expect(mocks.push).toHaveBeenCalledWith(
      '/plan-by-budget?origin=Stockholm&budget=10000&currency=SEK&adults=2&children=0',
    );
  });

  it('keeps the form interactive when required values are invalid', () => {
    render(<BudgetQuickForm messages={messages} />);

    const button = screen.getByRole('button', { name: 'Plan by budget' });
    fireEvent.submit(button.closest('form'));

    expect(button).toBeEnabled();
    expect(button.closest('form')).toHaveAttribute('aria-busy', 'false');
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
