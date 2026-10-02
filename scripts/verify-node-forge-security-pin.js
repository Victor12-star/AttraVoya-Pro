import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const EXPECTED_SPEC =
  'github:digitalbazaar/forge#ceba34402e329f0365134f23fe19898756527d65';
const EXPECTED_VERSION = '1.4.1-0';

const rootPackage = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (rootPackage.dependencies?.['node-forge'] !== EXPECTED_SPEC) {
  throw new Error('node-forge must remain pinned to the reviewed CVE-2026-85393 fix commit.');
}

const require = createRequire(import.meta.url);
const forgePackagePath = require.resolve('node-forge/package.json');
const forgePackage = JSON.parse(fs.readFileSync(forgePackagePath, 'utf8'));
if (forgePackage.version !== EXPECTED_VERSION) {
  throw new Error(
    `Resolved node-forge version ${forgePackage.version} does not match reviewed ${EXPECTED_VERSION}.`,
  );
}

const rsaPath = path.join(path.dirname(forgePackagePath), 'lib', 'rsa.js');
const rsaSource = fs.readFileSync(rsaPath, 'utf8');
const requiredFragments = [
  'obj.value.length !== 2 ||',
  'obj.value[0].value.length !==',
  "(('parameters' in capture) ? 2 : 1)",
];

for (const fragment of requiredFragments) {
  if (!rsaSource.includes(fragment)) {
    throw new Error('Resolved node-forge is missing the CVE-2026-85393 nested DigestAlgorithm guard.');
  }
}

console.log(
  `Verified node-forge ${forgePackage.version} contains the reviewed CVE-2026-85393 guard.`,
);
