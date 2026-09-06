const fs = require('node:fs');

const path = 'docs/CURRENT-WORK.md';
let text = fs.readFileSync(path, 'utf8');

const analyticsMarker = '## Mandatory privacy-conscious analytics and admin monitoring phase';
const phase8k = `### Phase 8K — Verified Affordability Result Web UI

Branch: \`feature/phase-8k-affordability-result-ui\`

PR: #38 — \`Phase 8K: show verified affordability results\`

Base checkpoint: \`d14e16e4a3c82f15fd6cb17242946addafab9d96\`, the verified Phase 8J-equivalent develop tree with cleanup CI #377 green.

Implemented:

- Aligned the web planner with the Phase 8I affordability evaluator so valid \`COMFORTABLE\`, \`TIGHT\`, and \`OVER_BUDGET\` results are accepted safely.
- Added a strict browser contract. It independently sums every collected category range and requires those totals to match the server evaluation-policy range.
- Currency mismatches, duplicate categories, malformed evidence, invented statuses, inconsistent arithmetic, and ranking unlock attempts fail closed.
- \`rankingEligible\` remains false. Budget fit does not imply ranking, recommendation, availability, suitability, or bookability.
- Before evidence inspection, catalog candidates show only that they are not ranked. Affordability status appears only after an evidence request.
- Evaluated results show the verified total evidence range and spendable budget while preserving the safety reserve.
- Added result copy for all 18 supported locales, including Arabic, plus focused contract and React tests.
- No ranking, recommendation persistence, booking flow, new provider integration, schema change, migration, or client evidence-write path was added.

Verification history:

- Exact clean implementation head \`21fe7bae57d86664f39edd6a8284350f27f650be\` ran PR CI #386.
- PR CI #386 passed all five top-level jobs, including strict JavaScript, the complete unit suite, repository-wide Prettier, production build, database verification, security checks, and live no-cost provider checks.
- Live-provider CI must not be overstated as proof of keyed pricing providers that are not configured.

`;
if (!text.includes(analyticsMarker)) throw new Error('Missing analytics marker');
if (!text.includes('### Phase 8K — Verified Affordability Result Web UI')) {
  text = text.replace(analyticsMarker, phase8k + analyticsMarker);
}

const phase8jVerification = `- Phase 8J final PR head \`f2d4c6b1fe005e76a87e177be3e529c5d6f2fd1d\` passed final PR CI #374, was squash-merged as \`cd12f6b5964ed589a19580426d1b7c9ba3c42dff\`, and post-merge CI #375 passed all five jobs.
- Cleanup commit \`d14e16e4a3c82f15fd6cb17242946addafab9d96\` restored the exact same Phase 8J tree after an accidental temporary marker and passed cleanup CI #377. It is the verified Phase 8K base.
`;
const phase8jAnchor = '- This does not constitute live verification of flight or the six newly injectable pricing categories because no trusted production pricing collectors were configured for them.\n';
if (!text.includes(phase8jAnchor)) throw new Error('Missing Phase 8J verification anchor');
if (!text.includes('Phase 8J final PR head')) {
  text = text.replace(phase8jAnchor, phase8jAnchor + phase8jVerification);
}

const nextStart = text.indexOf('### Required next steps');
const nextEnd = text.indexOf('## Standing final release-readiness requirement');
if (nextStart < 0 || nextEnd < 0 || nextEnd <= nextStart) throw new Error('Missing next-step boundaries');
const nextSteps = `### Required next steps

1. This handoff update changes PR #38's head. Run the complete five-job PR CI on the exact final documentation-inclusive head.
2. Confirm root \`package.json\` still uses canonical \`"format:check": "prettier --check ."\` and \`.github/workflows/ci.yml\` remains the canonical five-job workflow.
3. Verify PR #38 targets \`develop\`, is mergeable, contains only the six intended Phase 8K product/test files plus this handoff update, and contains no temporary helper files.
4. Squash-merge PR #38 using expected-head protection.
5. Verify the returned merge SHA is the actual \`develop\` head and its push CI passes all five top-level jobs.
6. Only after that gate is green, inspect the planner roadmap and start the next distinct slice from the new verified \`develop\` SHA.
7. Do not enable recommendation ranking merely because verified budget fit can now be displayed. Ranking requires a separate explicit policy and trustworthy production evidence; availability and bookability remain separate.

`;
text = text.slice(0, nextStart) + nextSteps + text.slice(nextEnd);

fs.writeFileSync(path, text);
