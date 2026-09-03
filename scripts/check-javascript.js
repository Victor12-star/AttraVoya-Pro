#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const requestedTargets = process.argv.slice(2);
const targets = requestedTargets.length > 0 ? requestedTargets : ['.'];

const configPaths = [...new Set(targets.map((target) => {
  const resolvedTarget = path.resolve(process.cwd(), target);

  if (!fs.existsSync(resolvedTarget)) {
    throw new Error(`JavaScript check target does not exist: ${target}`);
  }

  const targetStats = fs.statSync(resolvedTarget);
  const configPath = targetStats.isDirectory()
    ? path.join(resolvedTarget, 'jsconfig.json')
    : resolvedTarget;

  if (!fs.existsSync(configPath)) {
    throw new Error(`No jsconfig.json found for JavaScript check target: ${target}`);
  }

  return fs.realpathSync(configPath);
}))];

let tscPath;
try {
  tscPath = require.resolve('typescript/bin/tsc');
} catch {
  console.error('TypeScript is required only as the checkJs engine. Run pnpm install first.');
  process.exit(1);
}

let failed = false;

for (const configPath of configPaths) {
  const displayPath = path.relative(process.cwd(), configPath) || 'jsconfig.json';
  console.log(`Checking JavaScript with ${displayPath}`);

  const result = spawnSync(
    process.execPath,
    [tscPath, '--project', configPath, '--noEmit', '--pretty', process.stdout.isTTY ? 'true' : 'false'],
    {
      cwd: path.dirname(configPath),
      stdio: 'inherit',
    },
  );

  if (result.error) {
    console.error(`Unable to run the JavaScript checker for ${displayPath}: ${result.error.message}`);
    failed = true;
    continue;
  }

  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`JavaScript checks passed for ${configPaths.length} project(s).`);
}
