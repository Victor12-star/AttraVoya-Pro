import { BudgetAllocationSection } from '../../../features/planner/budget-allocation-section.jsx';
import { getBudgetAllocationCopy } from '../../../features/planner/budget-allocation-copy.js';
import { BudgetPlannerPage } from '../../../features/planner/budget-planner-page.jsx';
import { getBudgetPlannerCopy } from '../../../features/planner/budget-planner-copy.js';
import { CandidateEvidenceSection } from '../../../features/planner/candidate-evidence-section.jsx';
import { getCandidateEvidenceCopy } from '../../../features/planner/candidate-evidence-copy.js';
import { getRequestLocale } from '../../../i18n/request-locale.js';

export default async function TripsPage() {
  const locale = await getRequestLocale();
  const copy = getBudgetPlannerCopy(locale);
  const allocationCopy = getBudgetAllocationCopy(locale);
  const candidateEvidenceCopy = getCandidateEvidenceCopy(locale);

  return (
    <>
      <BudgetPlannerPage
        copy={copy}
        defaultCurrency={process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'SEK'}
      />
      <BudgetAllocationSection copy={allocationCopy} locale={locale} plannerCopy={copy} />
      <CandidateEvidenceSection copy={candidateEvidenceCopy} locale={locale} plannerCopy={copy} />
    </>
  );
}
