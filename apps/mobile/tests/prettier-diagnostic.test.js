import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, it } from '@jest/globals';

it('diagnoses subscription screen formatting', () => {
  const target = resolve('src/features/subscriptions/subscription-status-screen.jsx');
  const source = readFileSync(target, 'utf8');
  const formatted = execFileSync('pnpm', ['exec', 'prettier', target], { encoding: 'utf8' });

  const sourceLines = source.split('\n');
  const formattedLines = formatted.split('\n');
  const firstDifference = sourceLines.findIndex((line, index) => line !== formattedLines[index]);

  if (firstDifference !== -1) {
    const start = Math.max(0, firstDifference - 3);
    const end = firstDifference + 12;
    throw new Error(
      [
        `First formatting difference at line ${firstDifference + 1}`,
        'SOURCE:',
        ...sourceLines.slice(start, end),
        'FORMATTED:',
        ...formattedLines.slice(start, end),
      ].join('\n'),
    );
  }

  expect(source).toBe(formatted);
});
