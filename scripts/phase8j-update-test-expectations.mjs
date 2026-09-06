import { readFileSync, writeFileSync } from 'node:fs';

const path = 'apps/server/src/modules/planner/planner-affordability-evidence.test.js';
let text = readFileSync(path, 'utf8');

const suffix = [
  "{ category: 'FOOD', status: 'NOT_CONFIGURED' },",
  "{ category: 'LOCAL_TRANSPORT', status: 'NOT_CONFIGURED' },",
  "{ category: 'ACTIVITIES', status: 'NOT_CONFIGURED' },",
  "{ category: 'CHILDREN_ACTIVITIES', status: 'NOT_CONFIGURED' },",
  "{ category: 'AIRPORT_TRANSFER', status: 'NOT_CONFIGURED' },",
  "{ category: 'TRAVEL_INSURANCE', status: 'NOT_CONFIGURED' },",
];

function replaceOnce(oldValue, newValue, label) {
  const index = text.indexOf(oldValue);
  if (index < 0) throw new Error(`Missing expected Phase 8J test block: ${label}`);
  text = text.slice(0, index) + newValue + text.slice(index + oldValue.length);
}

const objectSuffix = suffix.map((line) => `        ${line}`).join('\n');
replaceOnce(
  "      collectionAttempts: [\n        { category: 'FLIGHTS', status: 'NOT_CONFIGURED' },\n        { category: 'ACCOMMODATION', status: 'NOT_CONFIGURED' },\n      ],",
  "      collectionAttempts: [\n        { category: 'FLIGHTS', status: 'NOT_CONFIGURED' },\n        { category: 'ACCOMMODATION', status: 'NOT_CONFIGURED' },\n" +
    objectSuffix +
    "\n      ],",
  'default collection attempts',
);

const exactBlocks = [
  [
    "      { category: 'FLIGHTS', status: 'NOT_CONFIGURED' },\n      { category: 'ACCOMMODATION', status: 'COLLECTED' },",
    'accommodation collected',
  ],
  [
    "      { category: 'FLIGHTS', status: 'COLLECTED' },\n      { category: 'ACCOMMODATION', status: 'NOT_CONFIGURED' },",
    'flight collected',
  ],
  [
    "      { category: 'FLIGHTS', status: 'NOT_CONFIGURED' },\n      { category: 'ACCOMMODATION', status: 'FAILED' },",
    'accommodation failed',
  ],
  [
    "      { category: 'FLIGHTS', status: 'FAILED' },\n      { category: 'ACCOMMODATION', status: 'NOT_CONFIGURED' },",
    'flight failed',
  ],
  [
    "      { category: 'FLIGHTS', status: 'NOT_CONFIGURED' },\n      { category: 'ACCOMMODATION', status: 'UNAVAILABLE' },",
    'accommodation unavailable',
  ],
];

const expectSuffix = suffix.map((line) => `      ${line}`).join('\n');
for (const [block, label] of exactBlocks) {
  replaceOnce(block, `${block}\n${expectSuffix}`, label);
}

writeFileSync(path, text, 'utf8');
