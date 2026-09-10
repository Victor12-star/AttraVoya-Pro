import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { expect, test } from 'vitest';

const requireFromRoot = createRequire(new URL('../../../../package.json', import.meta.url));
const prettier = requireFromRoot('prettier');

test('prints the formatter output for the Phase 10K target file', async () => {
  const targetUrl = new URL('../e2e/public-home.spec.js', import.meta.url);
  const source = await readFile(targetUrl, 'utf8');
  const formatted = await prettier.format(source, { parser: 'babel' });

  console.warn(`PRETTIER_PHASE_10K_START\n${formatted}PRETTIER_PHASE_10K_END`);
  expect(formatted.length).toBeGreaterThan(0);
});
