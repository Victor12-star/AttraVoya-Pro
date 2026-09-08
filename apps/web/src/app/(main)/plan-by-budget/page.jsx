import { CURRENCY_CODES } from '@attravoya/localization';

import { BudgetPlannerPage } from '../../../features/planner/budget-planner-page.jsx';
import { getBudgetPlannerCopy } from '../../../features/planner/budget-planner-copy.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';

export default async function PlanByBudgetPage({ searchParams }) {
  const [params, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const copy = getBudgetPlannerCopy(locale);

  const origin = typeof params?.origin === 'string' ? params.origin.trim().slice(0, 120) : '';
  const rawBudget = typeof params?.budget === 'string' ? params.budget.trim().slice(0, 30) : '';
  const budgetNumber = Number(rawBudget);
  const initialBudget = Number.isFinite(budgetNumber) && budgetNumber > 0 ? String(budgetNumber) : '';
  const requestedCurrency =
    typeof params?.currency === 'string' ? params.currency.trim().slice(0, 3).toUpperCase() : '';
  const defaultCurrency = CURRENCY_CODES.includes(requestedCurrency) ? requestedCurrency : 'SEK';

  return (
    <BudgetPlannerPage
      copy={copy}
      defaultCurrency={defaultCurrency}
      initialBudget={initialBudget}
      initialOrigin={origin}
      locale={locale}
    />
  );
}
