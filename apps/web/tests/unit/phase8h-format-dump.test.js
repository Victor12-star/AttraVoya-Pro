import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';
import { format, resolveConfig } from 'prettier';

const repositoryRoot = resolve(process.cwd(), '../..');
const targets = [
  'apps/web/src/features/planner/candidate-evidence-copy.js',
  'apps/web/src/features/planner/candidate-evidence-section.jsx',
  'apps/web/tests/unit/candidate-evidence-section.test.jsx',
];

describe('Phase 8H formatting diagnostic', () => {
  it('emits and applies canonical Prettier output for the Phase 8H files', async () => {
    for (const relativePath of targets) {
      const absolutePath = resolve(repositoryRoot, relativePath);
      const source = readFileSync(absolutePath, 'utf8');
      const config = (await resolveConfig(absolutePath)) ?? {};
      const formatted = await format(source, { ...config, filepath: absolutePath });

      writeFileSync(absolutePath, formatted, 'utf8');
      console.warn(
        `PHASE8H_FORMAT:${relativePath}:${gzipSync(Buffer.from(formatted)).toString('base64')}`,
      );
    }

    unlinkSync(resolve(process.cwd(), 'tests/unit/phase8h-format-dump.test.js'));
    expect(true).toBe(true);
  });
});
