import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { UI_LOCALES } from '../packages/localization/src/index.js';

const messagesDirectory = path.resolve('apps/web/messages');
const sourceLocale = 'en';

function flattenKeys(value, prefix = '') {
  const entries = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const current = prefix ? `${prefix}.${key}` : key;
    if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      entries.push(...flattenKeys(nestedValue, current));
    } else {
      entries.push([current, nestedValue]);
    }
  }
  return entries;
}

async function readMessages(locale) {
  const content = await readFile(path.join(messagesDirectory, `${locale}.json`), 'utf8');
  return JSON.parse(content);
}

async function main() {
  const expectedLocales = UI_LOCALES.map(({ code }) => code).sort();
  const files = (await readdir(messagesDirectory))
    .filter((file) => file.endsWith('.json') && !file.startsWith('_'))
    .map((file) => path.basename(file, '.json'))
    .sort();

  if (JSON.stringify(files) !== JSON.stringify(expectedLocales)) {
    throw new Error(
      `Translation files do not match enabled UI locales. Expected ${expectedLocales.join(', ')}; found ${files.join(', ')}`,
    );
  }

  const source = await readMessages(sourceLocale);
  const sourceKeys = new Set(flattenKeys(source).map(([key]) => key));

  for (const locale of expectedLocales) {
    const messages = await readMessages(locale);
    const flattened = flattenKeys(messages);
    const keys = new Set(flattened.map(([key]) => key));

    const missing = [...sourceKeys].filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !sourceKeys.has(key));
    const blank = flattened
      .filter(([, value]) => typeof value !== 'string' || !value.trim())
      .map(([key]) => key);

    if (missing.length || extra.length || blank.length) {
      throw new Error(
        `${locale}: missing=[${missing.join(', ')}] extra=[${extra.join(', ')}] blank=[${blank.join(', ')}]`,
      );
    }
  }

  console.log(`Translation check passed for ${expectedLocales.length} UI locales and ${sourceKeys.size} message keys.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
