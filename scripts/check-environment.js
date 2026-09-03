#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const MIN_NODE = [24, 20, 0];
const MAX_NODE_MAJOR = 25;
const MIN_PNPM = [11, 22, 0];
const MAX_PNPM_MAJOR = 12;

function parseVersion(value) {
  const match = String(value).trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function commandVersion(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) return null;
  return (result.stdout || result.stderr).trim();
}

function status(label, ok, detail) {
  console.log(`${ok ? '✓' : '✗'} ${label}: ${detail}`);
  return ok;
}

let healthy = true;

const nodeVersion = parseVersion(process.version);
const nodeOk =
  nodeVersion &&
  compareVersions(nodeVersion, MIN_NODE) >= 0 &&
  nodeVersion[0] < MAX_NODE_MAJOR;
healthy = status('Node.js', Boolean(nodeOk), `${process.version} (required >=24.20.0 <25)`) && healthy;

const pnpmRaw = commandVersion('pnpm');
const pnpmVersion = pnpmRaw && parseVersion(pnpmRaw);
const pnpmOk =
  pnpmVersion &&
  compareVersions(pnpmVersion, MIN_PNPM) >= 0 &&
  pnpmVersion[0] < MAX_PNPM_MAJOR;
healthy = status('pnpm', Boolean(pnpmOk), pnpmRaw || 'not found (required >=11.22.0 <12)') && healthy;

const dockerRaw = commandVersion('docker');
healthy = status('Docker', Boolean(dockerRaw), dockerRaw || 'not found') && healthy;

const composeRaw = dockerRaw ? commandVersion('docker', ['compose', 'version']) : null;
healthy = status('Docker Compose', Boolean(composeRaw), composeRaw || 'not found') && healthy;

const envPath = path.join(process.cwd(), '.env');
healthy = status('.env', fs.existsSync(envPath), fs.existsSync(envPath) ? 'present' : 'missing — run node scripts/setup-development.js') && healthy;

if (!healthy) {
  console.error('\nEnvironment check failed. Fix the items marked ✗ before starting development services.');
  process.exit(1);
}

console.log('\nEnvironment check passed.');
