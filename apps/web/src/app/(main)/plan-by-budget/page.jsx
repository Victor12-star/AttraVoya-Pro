import { FeaturePage } from '../../../components/common/feature-page.jsx';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function PlanByBudgetPage({ searchParams }) {
  const params = await searchParams;
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  const origin = typeof params?.origin === 'string' ? params.origin.slice(0, 120) : '';
  const budget = typeof params?.budget === 'string' ? params.budget.slice(0, 30) : '';
  const currency = typeof params?.currency === 'string' ? params.currency.slice(0, 3).toUpperCase() : '';

  return (
    <FeaturePage
      eyebrow={messages.budget.title}
      title={messages.home.budgetTitle}
      description={messages.home.budgetDescription}
      backLabel={messages.navigation.explore}
    >
      {origin || budget ? (
        <div className="query-summary">
          {origin ? <div><strong>{messages.budget.origin}:</strong> {origin}</div> : null}
          {budget ? <div><strong>{messages.budget.totalBudget}:</strong> {budget} {currency}</div> : null}
          <div>{messages.common.unavailable}</div>
        </div>
      ) : null}
    </FeaturePage>
  );
}
