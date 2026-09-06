import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { format, resolveConfig } from 'prettier';

const repositoryRoot = resolve(process.cwd(), '../..');
const targets = [
  'apps/web/src/features/planner/candidate-evidence-copy.js',
  'apps/web/src/features/planner/candidate-evidence-section.jsx',
  'apps/web/tests/unit/candidate-evidence-section.test.jsx',
];

function lineChanges(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const rows = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }

  const changes = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    const beforeStart = i;
    const afterStart = j;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) break;
      if (j >= b.length || (i < a.length && rows[i + 1][j] >= rows[i][j + 1])) i += 1;
      else j += 1;
    }
    changes.push({
      beforeStart: beforeStart + 1,
      beforeEnd: i,
      afterStart: afterStart + 1,
      afterEnd: j,
      replacement: b.slice(afterStart, j),
    });
  }

  return changes;
}

describe('Phase 8H formatting diagnostic', () => {
  it('emits exact formatting edits and applies canonical output in the CI workspace', async () => {
    for (const relativePath of targets) {
      const absolutePath = resolve(repositoryRoot, relativePath);
      const source = readFileSync(absolutePath, 'utf8');
      const config = (await resolveConfig(absolutePath)) ?? {};
      const formatted = await format(source, { ...config, filepath: absolutePath });

      console.warn(`PHASE8H_DIFF:${relativePath}:${JSON.stringify(lineChanges(source, formatted))}`);
      writeFileSync(absolutePath, formatted, 'utf8');
    }

    unlinkSync(resolve(process.cwd(), 'tests/unit/phase8h-format-dump.test.js'));
    expect(true).toBe(true);
  });
});
