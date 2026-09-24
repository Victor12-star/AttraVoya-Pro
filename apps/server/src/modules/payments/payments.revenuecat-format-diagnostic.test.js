import { readFile } from 'node:fs/promises';

import * as prettier from 'prettier';
import { describe, it } from 'vitest';

describe('temporary RevenueCat formatting diagnostic', () => {
  it('prints the exact repository Prettier output when the source differs', async () => {
    const sourceUrl = new URL('./payments.revenuecat-subscription.js', import.meta.url);
    const source = await readFile(sourceUrl, 'utf8');
    const formatted = await prettier.format(source, {
      arrowParens: 'always',
      bracketSameLine: false,
      bracketSpacing: true,
      endOfLine: 'lf',
      parser: 'babel',
      printWidth: 100,
      proseWrap: 'preserve',
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'all',
      useTabs: false,
    });

    if (formatted !== source) {
      console.log('PRETTIER_EXPECTED_START');
      console.log(formatted);
      console.log('PRETTIER_EXPECTED_END');
    }
  });
});
