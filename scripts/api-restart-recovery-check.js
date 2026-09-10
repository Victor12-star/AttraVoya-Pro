#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { once } from 'node:events';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const START_TIMEOUT_MS = 20_000;
const STOP_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 250;

/**
 * @typedef {object} HealthProbe
 * @property {string} [status]
 * @property {string} [service]
 * @property {string} [database]
 */

/** @returns {never} */
function fail(message) {
  throw new Error(message);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseSafetyContract() {
  if (process.env.API_RESTART_RECOVERY_TEST !== '1') {
    fail('Refusing restart/recovery check without API_RESTART_RECOVERY_TEST=1.');
  }

  const host = process.env.API_HOST?.trim() || '127.0.0.1';
  if (!LOOPBACK_HOSTS.has(host)) {
    fail('Restart/recovery check is restricted to a loopback API host.');
  }

  const port = Number(process.env.API_PORT ?? 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    fail('API_PORT must be a valid TCP port for the restart/recovery check.');
  }

  const rawDatabaseUrl = process.env.DATABASE_URL?.trim();
  if (!rawDatabaseUrl) {
    fail('DATABASE_URL is required for the restart/recovery check.');
  }

  const databaseUrl = new URL(rawDatabaseUrl);
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    fail('DATABASE_URL must use the postgres or postgresql protocol.');
  }
  if (!LOOPBACK_HOSTS.has(databaseUrl.hostname)) {
    fail('Restart/recovery check is restricted to a loopback PostgreSQL host.');
  }

  const urlHost = host === '::1' ? '[::1]' : host;
  return {
    baseUrl: `http://${urlHost}:${port}`,
    host,
    port,
  };
}

function startApi({ host, port }) {
  return spawn(process.execPath, ['apps/server/src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_HOST: host,
      API_PORT: String(port),
    },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
}

/** @returns {Promise<HealthProbe | null>} */
async function readProbe(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1_000),
    });
    if (!response.ok) return null;
    return /** @type {HealthProbe} */ (await response.json());
  } catch {
    return null;
  }
}

async function waitForHealthyProcess(child, baseUrl, label) {
  const deadline = Date.now() + START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      fail(`${label} API process exited before becoming ready.`);
    }

    const liveness = await readProbe(`${baseUrl}/api/v1/health/live`);
    const readiness = await readProbe(`${baseUrl}/api/v1/health/ready`);

    if (
      liveness?.status === 'ok' &&
      liveness?.service === 'attravoya-api' &&
      readiness?.status === 'ready' &&
      readiness?.database === 'available'
    ) {
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  fail(`${label} API process did not regain PostgreSQL-backed readiness in time.`);
}

async function stopApi(child, label) {
  if (child.exitCode !== null || child.signalCode !== null) {
    fail(`${label} API process exited before the graceful-shutdown signal.`);
  }

  const exitPromise = once(child, 'exit');
  if (!child.kill('SIGTERM')) {
    fail(`Failed to send SIGTERM to the ${label} API process.`);
  }

  let timeout;
  try {
    const [code, signal] = await Promise.race([
      exitPromise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} API process exceeded the shutdown deadline.`)),
          STOP_TIMEOUT_MS,
        );
      }),
    ]);

    if (code !== 0 || signal !== null) {
      fail(
        `${label} API process did not complete graceful shutdown cleanly (code=${code}, signal=${signal}).`,
      );
    }
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

async function main() {
  const contract = parseSafetyContract();
  let activeProcess = null;

  try {
    activeProcess = startApi(contract);
    await waitForHealthyProcess(activeProcess, contract.baseUrl, 'Initial');
    console.log('Initial API process reached PostgreSQL-backed readiness.');

    await stopApi(activeProcess, 'Initial');
    activeProcess = null;
    console.log('Initial API process completed graceful SIGTERM shutdown.');

    activeProcess = startApi(contract);
    await waitForHealthyProcess(activeProcess, contract.baseUrl, 'Replacement');
    console.log('Replacement API process regained PostgreSQL-backed readiness.');

    await stopApi(activeProcess, 'Replacement');
    activeProcess = null;
    console.log('API restart and recovery contract passed.');
  } finally {
    if (activeProcess && activeProcess.exitCode === null && activeProcess.signalCode === null) {
      activeProcess.kill('SIGKILL');
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(`API restart/recovery check failed: ${error.message}`);
  process.exitCode = 1;
}
