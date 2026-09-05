import { BudgetAllocationSection } from '../../../features/planner/budget-allocation-section.jsx';
import { getBudgetAllocationCopy } from '../../../features/planner/budget-allocation-copy.js';
import { BudgetPlannerPage } from '../../../features/planner/budget-planner-page.jsx';
import { getBudgetPlannerCopy } from '../../../features/planner/budget-planner-copy.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';

export default async function TripsPage() {
  const locale = await getRequestLocale();
  const copy = getBudgetPlannerCopy(locale);
  const allocationCopy = getBudgetAllocationCopy(locale);

  return (
    <>
      <BudgetPlannerPage
        copy={copy}
        defaultCurrency={process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'SEK'}
      />
      <BudgetAllocationSection copy={allocationCopy} locale={locale} plannerCopy={copy} />
    </>
  );
}
