import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { expect, test } from 'vitest';

const rootPackagePath = resolve(process.cwd(), '../../package.json');
const requireFromRoot = createRequire(rootPackagePath);
const prettier = requireFromRoot('prettier');

test('prints the formatter output for the Phase 10K target file', async () => {
  const targetPath = resolve(process.cwd(), 'tests/e2e/public-home.spec.js');
  const source = await readFile(targetPath, 'utf8');
  const config = await prettier.resolveConfig(targetPath);
  const formatted = await prettier.format(source, {
    ...config,
    filepath: targetPath,
  });

  console.warn(`PRETTIER_PHASE_10K_START\n${formatted}PRETTIER_PHASE_10K_END`);
  expect(formatted.length).toBeGreaterThan(0);
});
