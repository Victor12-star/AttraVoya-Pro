const fs = require('node:fs');

function replaceRequired(text, before, after, label) {
  if (!text.includes(before)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(before, after);
}

const contractPath = 'apps/web/src/features/planner/affordability-result-contract.js';
let contract = fs.readFileSync(contractPath, 'utf8');
const parityStart = contract.indexOf('function hasCompleteCategoryParity');
const parityEnd = contract.indexOf('function isValidEvaluationPolicy');
if (parityStart < 0 || parityEnd < 0) throw new Error('Could not locate parity validator');
contract =
  contract.slice(0, parityStart) +
  `function getCompleteEvidenceTotals(evidence, expectedCurrency) {
  if (
    evidence.status !== 'COMPLETE_EVIDENCE' ||
    !Array.isArray(evidence.required) ||
    evidence.required.length === 0 ||
    !Array.isArray(evidence.collected) ||
    !Array.isArray(evidence.missingCategories) ||
    evidence.missingCategories.length !== 0 ||
    evidence.collected.length !== evidence.required.length
  ) {
    return null;
  }

  const requiredCategories = new Set();
  for (const item of evidence.required) {
    if (
      !item ||
      !isNonEmptyString(item.category) ||
      item.status !== 'COLLECTED' ||
      item.targetBasis !== 'PLANNING_TARGET' ||
      moneyToCents(item.targetAmount) === null ||
      requiredCategories.has(item.category)
    ) {
      return null;
    }
    requiredCategories.add(item.category);
  }

  const collectedCategories = new Set();
  let totalMin = 0;
  let totalMax = 0;
  for (const item of evidence.collected) {
    const amountMin = moneyToCents(item?.amountMin);
    const amountMax = moneyToCents(item?.amountMax);
    if (
      !item ||
      !requiredCategories.has(item.category) ||
      collectedCategories.has(item.category) ||
      item.amountScope !== 'PLANNER_CATEGORY_TOTAL' ||
      amountMin === null ||
      amountMax === null ||
      amountMax < amountMin ||
      item.currencyCode !== expectedCurrency ||
      !PRICING_BASES.has(item.pricingBasis) ||
      !CONFIDENCE.has(item.confidence) ||
      !isNonEmptyString(item.sourceProvider) ||
      !isNonEmptyString(item.sourceExternalId) ||
      typeof item.sourceFetchedAt !== 'string' ||
      Number.isNaN(Date.parse(item.sourceFetchedAt)) ||
      item.verifiedMarketEvidence !== true
    ) {
      return null;
    }
    collectedCategories.add(item.category);
    totalMin += amountMin;
    totalMax += amountMax;
    if (!Number.isSafeInteger(totalMin) || !Number.isSafeInteger(totalMax)) return null;
  }

  if (collectedCategories.size !== requiredCategories.size) return null;
  return { totalMin, totalMax };
}

` +
  contract.slice(parityEnd);
contract = replaceRequired(
  contract,
  `  const policy = evaluation.evaluationPolicy;
  if (!hasCompleteCategoryParity(evidence, policy.currencyCode)) return false;

  const spendable = moneyToCents(policy.spendableBudget);
  const amountMin = moneyToCents(policy.totalEvidenceRange.amountMin);
  const amountMax = moneyToCents(policy.totalEvidenceRange.amountMax);
  if (spendable === null || amountMin === null || amountMax === null) return false;
`,
  `  const policy = evaluation.evaluationPolicy;
  const evidenceTotals = getCompleteEvidenceTotals(evidence, policy.currencyCode);
  if (!evidenceTotals) return false;

  const spendable = moneyToCents(policy.spendableBudget);
  const amountMin = moneyToCents(policy.totalEvidenceRange.amountMin);
  const amountMax = moneyToCents(policy.totalEvidenceRange.amountMax);
  if (
    spendable === null ||
    amountMin === null ||
    amountMax === null ||
    evidenceTotals.totalMin !== amountMin ||
    evidenceTotals.totalMax !== amountMax
  ) {
    return false;
  }
`,
  'policy totals parity',
);
fs.writeFileSync(contractPath, contract);

const componentPath = 'apps/web/src/features/planner/candidate-evidence-section.jsx';
let component = fs.readFileSync(componentPath, 'utf8');
component = replaceRequired(
  component,
  `import { apiClient } from '../../lib/api-client.js';
import styles from './candidate-evidence-section.module.css';`,
  `import { apiClient } from '../../lib/api-client.js';
import { isSafeAffordabilityEvaluation } from './affordability-result-contract.js';
import { getAffordabilityResultCopy } from './affordability-result-copy.js';
import styles from './candidate-evidence-section.module.css';`,
  'component imports',
);
component = replaceRequired(
  component,
  ` * @property {{budgetFit: string, rankingEligible: boolean, affordabilityConfirmed: boolean, evidenceReady: boolean}} evaluation`,
  ` * @property {{budgetFit: string, rankingEligible: boolean, affordabilityConfirmed: boolean, evidenceReady: boolean, evaluationPolicy?: {policyKey: string, policyVersion: number, status: string, comparisonBasis: string, safetyReserveProtected: boolean, currencyCode: string, spendableBudget: string, totalEvidenceRange: {amountMin: string, amountMax: string}}}} evaluation`,
  'evaluation typedef',
);
component = replaceRequired(
  component,
  `  return Boolean(
    evaluation &&
    evaluation.budgetFit === 'NOT_EVALUATED' &&
    evaluation.rankingEligible === false &&
    evaluation.affordabilityConfirmed === false &&
    typeof evaluation.evidenceReady === 'boolean' &&
    provenance &&`,
  `  return Boolean(
    isSafeAffordabilityEvaluation(evidence, evaluation) &&
    provenance &&`,
  'evidence evaluation validator',
);
component = replaceRequired(
  component,
  `function formatTimestamp(value, locale) {`,
  `function formatMoneyValue(value, currencyCode, locale) {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return \`${formatter.format(Number(value))} ${currencyCode}\`;
}

function formatEvaluationRange(policy, locale) {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return \`${formatter.format(Number(policy.totalEvidenceRange.amountMin))}–${formatter.format(Number(policy.totalEvidenceRange.amountMax))} ${policy.currencyCode}\`;
}

function formatTimestamp(value, locale) {`,
  'money helpers',
);
component = replaceRequired(
  component,
  `  const selectedDestination = candidateSet?.destinations.find(
    (destination) => destination.id === selectedDestinationId,
  );

  return (`,
  `  const selectedDestination = candidateSet?.destinations.find(
    (destination) => destination.id === selectedDestinationId,
  );
  const resultCopy = getAffordabilityResultCopy(locale);

  return (`,
  'result copy',
);
component = component.replaceAll(`                      <span>{copy.notAffordableYet}</span>\n`, '');
component = replaceRequired(
  component,
  `{copy.notAffordableYet}
                        </div>`,
  `{resultCopy.statuses[affordabilityEvidence.evaluation.budgetFit]}
                        </div>`,
  'result status badge',
);
component = replaceRequired(
  component,
  `                      <p className={styles.evidenceSummary}>
                        {affordabilityEvidence.evidence.status === 'COMPLETE_EVIDENCE'
                          ? copy.evidenceComplete
                          : copy.evidenceIncomplete}
                      </p>

                      <div>`,
  `                      <p className={styles.evidenceSummary}>
                        {affordabilityEvidence.evaluation.budgetFit !== 'NOT_EVALUATED'
                          ? resultCopy.summaries[affordabilityEvidence.evaluation.budgetFit]
                          : affordabilityEvidence.evidence.status === 'COMPLETE_EVIDENCE'
                            ? copy.evidenceComplete
                            : copy.evidenceIncomplete}
                      </p>

                      {affordabilityEvidence.evaluation.budgetFit !== 'NOT_EVALUATED' ? (
                        <div className={styles.evaluationGrid}>
                          <div className={styles.evaluationMetric}>
                            <span>{resultCopy.totalRange}</span>
                            <strong>
                              {formatEvaluationRange(
                                affordabilityEvidence.evaluation.evaluationPolicy,
                                locale,
                              )}
                            </strong>
                          </div>
                          <div className={styles.evaluationMetric}>
                            <span>{resultCopy.spendableBudget}</span>
                            <strong>
                              {formatMoneyValue(
                                affordabilityEvidence.evaluation.evaluationPolicy.spendableBudget,
                                affordabilityEvidence.evaluation.evaluationPolicy.currencyCode,
                                locale,
                              )}
                            </strong>
                          </div>
                        </div>
                      ) : null}

                      <div>`,
  'evaluation result body',
);
component = replaceRequired(
  component,
  `<p>{copy.provenance}</p>`,
  `<p>
                            {affordabilityEvidence.evaluation.budgetFit !== 'NOT_EVALUATED'
                              ? resultCopy.boundary
                              : copy.provenance}
                          </p>`,
  'evaluated boundary',
);
fs.writeFileSync(componentPath, component);

const cssPath = 'apps/web/src/features/planner/candidate-evidence-section.module.css';
let css = fs.readFileSync(cssPath, 'utf8');
css = replaceRequired(
  css,
  `.provenance p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.spin {`,
  `.provenance p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.evaluationGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.evaluationMetric {
  min-width: 0;
  display: grid;
  gap: 5px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-muted);
  padding: 14px;
}

.evaluationMetric span {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.evaluationMetric strong {
  overflow-wrap: anywhere;
  font-size: 16px;
}

.spin {`,
  'evaluation styles',
);
css = replaceRequired(
  css,
  `  .candidateGrid,
  .requiredList,
  .collectedList dl {`,
  `  .candidateGrid,
  .requiredList,
  .collectedList dl,
  .evaluationGrid {`,
  'evaluation responsive styles',
);
fs.writeFileSync(cssPath, css);

const uiTestPath = 'apps/web/tests/unit/candidate-evidence-section.test.jsx';
let uiTest = fs.readFileSync(uiTestPath, 'utf8');
uiTest = replaceRequired(
  uiTest,
  `async function selectSavedBrief() {`,
  `function evaluatedEvidence() {
  const categories = [
    'FLIGHTS',
    'ACCOMMODATION',
    'FOOD',
    'LOCAL_TRANSPORT',
    'ACTIVITIES',
    'CHILDREN_ACTIVITIES',
    'AIRPORT_TRANSFER',
    'TRAVEL_INSURANCE',
  ];

  return {
    ...evidence(),
    evidence: {
      policyKey: 'attravoya-affordability-evidence-v1',
      policyVersion: 1,
      status: 'COMPLETE_EVIDENCE',
      required: categories.map((category) => ({
        category,
        targetAmount: '100.00',
        targetBasis: 'PLANNING_TARGET',
        status: 'COLLECTED',
      })),
      collected: categories.map((category, index) => ({
        category,
        amountScope: 'PLANNER_CATEGORY_TOTAL',
        amountMin: index === 0 ? '180.00' : '80.00',
        amountMax: index === 0 ? '220.00' : '90.00',
        currencyCode: 'EUR',
        pricingBasis: 'VERIFIED_PRICE',
        confidence: 'HIGH',
        sourceProvider: \`verified-${category.toLowerCase()}-test\`,
        sourceExternalId: \`evidence-${index}\`,
        sourceFetchedAt: '2026-09-06T16:00:00.000Z',
        verifiedMarketEvidence: true,
      })),
      missingCategories: [],
      collectionAttempts: categories.map((category) => ({ category, status: 'COLLECTED' })),
    },
    evaluation: {
      budgetFit: 'COMFORTABLE',
      rankingEligible: false,
      affordabilityConfirmed: true,
      evidenceReady: true,
      evaluationPolicy: {
        policyKey: 'attravoya-affordability-evaluation-v1',
        policyVersion: 1,
        status: 'EVALUATED',
        comparisonBasis: 'SPENDABLE_BUDGET',
        safetyReserveProtected: true,
        currencyCode: 'EUR',
        spendableBudget: '900.00',
        totalEvidenceRange: { amountMin: '740.00', amountMax: '850.00' },
      },
    },
    provenance: {
      kind: 'AFFORDABILITY_EVIDENCE_GATE',
      liveDataUsed: true,
      providerDataUsed: true,
      pricingDataUsed: true,
    },
  };
}

async function selectSavedBrief() {`,
  'evaluated UI fixture',
);
uiTest = replaceRequired(
  uiTest,
  `  it('rejects a candidate payload that claims ranking or pricing evaluation', async () => {`,
  `  it('shows a verified comfortable budget-fit result without ranking or booking claims', async () => {
    mocks.getPlannerAffordabilityEvidence.mockResolvedValue({
      affordabilityEvidence: evaluatedEvidence(),
    });

    render(<CandidateEvidenceSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    await selectSavedBrief();
    fireEvent.click(screen.getByRole('button', { name: copy.inspect }));

    expect(await screen.findByText('Within spendable budget')).toBeInTheDocument();
    expect(screen.getByText('740.00–850.00 EUR')).toBeInTheDocument();
    expect(screen.getByText('900.00 EUR')).toBeInTheDocument();
    expect(screen.getAllByText(copy.notRanked).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/book now|best destination|recommended for you/i),
    ).not.toBeInTheDocument();
  });

  it('rejects a candidate payload that claims ranking or pricing evaluation', async () => {`,
  'evaluated UI test',
);
fs.writeFileSync(uiTestPath, uiTest);

const contractTestPath = 'apps/web/tests/unit/affordability-result-contract.test.js';
let contractTest = fs.readFileSync(contractTestPath, 'utf8');
contractTest = replaceRequired(
  contractTest,
  `function completeEvidence() {`,
  `function completeEvidence(firstMin = '180.00', firstMax = '220.00') {`,
  'contract fixture signature',
);
contractTest = replaceRequired(
  contractTest,
  `amountMin: index === 0 ? '180.00' : '80.00',`,
  `amountMin: index === 0 ? firstMin : '80.00',`,
  'contract min fixture',
);
contractTest = replaceRequired(
  contractTest,
  `amountMax: index === 0 ? '220.00' : '90.00',`,
  `amountMax: index === 0 ? firstMax : '90.00',`,
  'contract max fixture',
);
contractTest = replaceRequired(
  contractTest,
  `completeEvidence(),
        evaluation('TIGHT', {`,
  `completeEvidence('280.00', '330.00'),
        evaluation('TIGHT', {`,
  'tight evidence totals',
);
contractTest = replaceRequired(
  contractTest,
  `completeEvidence(),
        evaluation('OVER_BUDGET', {`,
  `completeEvidence('350.00', '380.00'),
        evaluation('OVER_BUDGET', {`,
  'over budget evidence totals',
);
contractTest = replaceRequired(
  contractTest,
  `  it('rejects currency or evidence-category tampering', () => {`,
  `  it('rejects a policy total that does not equal the collected category totals', () => {
    expect(
      isSafeAffordabilityEvaluation(
        completeEvidence(),
        evaluation('COMFORTABLE', {
          evaluationPolicy: {
            ...evaluation('COMFORTABLE').evaluationPolicy,
            totalEvidenceRange: { amountMin: '700.00', amountMax: '800.00' },
          },
        }),
      ),
    ).toBe(false);
  });

  it('rejects currency or evidence-category tampering', () => {`,
  'policy sum tampering test',
);
fs.writeFileSync(contractTestPath, contractTest);
