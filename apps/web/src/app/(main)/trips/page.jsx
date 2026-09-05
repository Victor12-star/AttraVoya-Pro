import { BudgetPlannerPage } from '../../../features/planner/budget-planner-page.jsx';
import { getBudgetPlannerCopy } from '../../../features/planner/budget-planner-copy.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';

export default async function TripsPage() {
  const locale = await getRequestLocale();
  const copy = getBudgetPlannerCopy(locale);

  return (
    <BudgetPlannerPage
      copy={copy}
      defaultCurrency={process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'SEK'}
    />
  );
}
