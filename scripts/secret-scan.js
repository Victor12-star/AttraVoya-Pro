#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const trackedFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const excluded = new Set(['pnpm-lock.yaml']);
const patterns = [
  { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Stripe live secret', pattern: /\bsk_live_[A-Za-z0-9]{20,}\b/ },
  { name: 'Resend API key', pattern: /\bre_[A-Za-z0-9_-]{20,}\b/ },
];

const findings = [];

for (const file of trackedFiles) {
  if (excluded.has(file)) continue;

  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const { name, pattern } of patterns) {
    if (pattern.test(text)) findings.push(`${file}: possible ${name}`);
  }
}

if (findings.length) {
  console.error('Potential committed secrets detected:');
  for (const finding of findings) console.error(`  ✗ ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed across ${trackedFiles.length} tracked files.`);
