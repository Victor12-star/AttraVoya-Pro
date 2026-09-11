import { readFile } from 'node:fs/promises';
import * as prettier from 'prettier';

const files = [
  'apps/web/src/features/profile/session-security-copy.js',
  'apps/web/src/features/profile/session-security-page.jsx',
  'apps/web/tests/e2e/session-security.spec.js',
  'apps/web/tests/unit/session-security-page.test.jsx',
];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const formatted = await prettier.format(source, { parser: 'babel' });
  const encoded = Buffer.from(formatted, 'utf8').toString('base64');
  const chunkSize = 8000;
  const chunks = Math.ceil(encoded.length / chunkSize);
  for (let index = 0; index < chunks; index += 1) {
    console.log(`FORMAT_DIAGNOSTIC|${file}|${index + 1}/${chunks}|${encoded.slice(index * chunkSize, (index + 1) * chunkSize)}`);
  }
}

throw new Error('Intentional diagnostic failure after emitting exact Prettier output.');
