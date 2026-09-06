import fs from 'node:fs/promises';

import { expect, it } from 'vitest';
import * as prettier from 'prettier';

import prettierConfig from '../../../../prettier.config.js';

function lineDiff(before, after) {
  const left = before.split('\n');
  const right = after.split('\n');
  const lengths = Array.from(
    { length: left.length + 1 },
    () => new Uint16Array(right.length + 1),
  );

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      lengths[i][j] =
        left[i] === right[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const changes = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      i += 1;
      j += 1;
    } else if (
      j < right.length &&
      (i >= left.length || lengths[i][j + 1] > lengths[i + 1][j])
    ) {
      changes.push(`+${j + 1}: ${right[j]}`);
      j += 1;
    } else if (i < left.length) {
      changes.push(`-${i + 1}: ${left[i]}`);
      i += 1;
    }
  }

  return changes.join('\n');
}

it('prints the exact canonical Prettier differences for Phase 8C files', async () => {
  const paths = [
    'src/features/planner/budget-allocation-section.jsx',
    'tests/unit/budget-allocation-section.test.jsx',
  ];
  const differences = [];

  for (const filepath of paths) {
    const source = await fs.readFile(filepath, 'utf8');
    const formatted = await prettier.format(source, { ...prettierConfig, filepath });
    if (source !== formatted) {
      differences.push(`=== ${filepath} ===\n${lineDiff(source, formatted)}`);
    }
  }

  if (differences.length > 0) {
    console.error(differences.join('\n'));
  }
  expect(differences).toEqual([]);
});
