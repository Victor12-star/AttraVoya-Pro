const fs = require('node:fs');

const path = 'apps/web/src/features/planner/candidate-evidence-section.jsx';
let text = fs.readFileSync(path, 'utf8');

const copyLine = `  const resultCopy = getAffordabilityResultCopy(locale);\n`;
if (!text.includes(copyLine)) throw new Error('Missing result copy target');
text = text.replace(
  copyLine,
  `${copyLine}  const evaluationPolicy = affordabilityEvidence?.evaluation?.evaluationPolicy;\n`,
);

const condition = `                      {affordabilityEvidence.evaluation.budgetFit !== 'NOT_EVALUATED' ? (\n                        <div className={styles.evaluationGrid}>`;
if (!text.includes(condition)) throw new Error('Missing evaluation grid condition');
text = text.replace(
  condition,
  `                      {affordabilityEvidence.evaluation.budgetFit !== 'NOT_EVALUATED' &&\n                      evaluationPolicy ? (\n                        <div className={styles.evaluationGrid}>`,
);

const oldPolicy = 'affordabilityEvidence.evaluation.evaluationPolicy';
const occurrences = text.split(oldPolicy).length - 1;
if (occurrences !== 3) throw new Error(`Expected 3 evaluationPolicy render accesses, found ${occurrences}`);
text = text.replaceAll(oldPolicy, 'evaluationPolicy');

fs.writeFileSync(path, text);
