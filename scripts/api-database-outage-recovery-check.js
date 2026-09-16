#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const CONTAINER_ID_PATTERN = /^[a-f0-9]{12,64}$/i;
const START_TIMEOUT_MS = 20_000;
const OUTAGE_TIMEOUT_MS = 20_000;
const RECOVERY_TIMEOUT_MS = 30_000;
const STOP_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

/** @returns {never} */
function fail(message) {
  throw new Error(message);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseSafetyContract() {
  if (process.env.API_DATABASE_OUTAGE_RECOVERY_TEST !== '1') {
    fail(
      'Refusing database-outage recovery check without API_DATABASE_OUTAGE_RECOVERY_TEST=1.',
    );
  }

  const host = process.env.API_HOST?.trim() || '127.0.0.1';
  if (!LOOPBACK_HOSTS.has(host)) {
    fail('Database-outage recovery check is restricted to a loopback API host.');
  }

  const port = Number(process.env.API_PORT ?? 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    fail('API_PORT must be a valid TCP port for the database-outage recovery check.');
  }

  const rawDatabaseUrl = process.env.DATABASE_URL?.trim();
  if (!rawDatabaseUrl) {
    fail('DATABASE_URL is required for the database-outage recovery check.');
  }

  const databaseUrl = new URL(rawDatabaseUrl);
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    fail('DATABASE_URL must use the postgres or postgresql protocol.');
  }
  if (!LOOPBACK_HOSTS.has(databaseUrl.hostname)) {
    fail('Database-outage recovery check is restricted to a loopback PostgreSQL host.');
  }

  const databaseContainerId = process.env.POSTGRES_OUTAGE_CONTAINER_ID?.trim();
  if (!databaseContainerId || !CONTAINER_ID_PATTERN.test(databaseContainerId)) {
    fail('POSTGRES_OUTAGE_CONTAINER_ID must be an explicit Docker container ID.');
  }

  const urlHost = host === '::1' ? '[::1]' : host;
  return {
    baseUrl: `http://${urlHost}:${port}`,
    databaseContainerId,
    host,
    port,
  };
}

function runDocker(arguments_) {
  return execFileSync('docker', arguments_, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function verifyDatabaseContainer(containerId) {
  const running = runDocker(['inspect', '--format', '{{.State.Running}}', containerId]);
  const exposedPorts = runDocker([
    'inspect',
    '--format',
    '{{json .NetworkSettings.Ports}}',
    containerId,
  ]);

  if (running !== 'true') {
    fail('The disposable PostgreSQL container must be running before the recovery check.');
  }
  if (!exposedPorts.includes('5432/tcp')) {
    fail('The selected Docker container does not expose PostgreSQL port 5432.');
  }
}

function startApi({ host, port }) {
  return spawn(process.execPath, ['apps/server/src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_HOST: host,
      API_PORT: String(port),
      DB_POOL_CONNECTION_TIMEOUT_MS: '1000',
    },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
}

function assertApiRunning(child, stage) {
  if (child.exitCode !== null || child.signalCode !== null) {
    fail(`API process exited during ${stage}.`);
  }
}

/**
 * @typedef {object} HealthProbe
 * @property {string} [status]
 * @property {string} [service]
 * @property {string} [database]
 */

/**
 * @param {string} url
 * @returns {Promise<{ body: HealthProbe | null, status: number } | null>}
 */
async function readProbe(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
    });
    let body = null;

    try {
      body = /** @type {HealthProbe} */ (await response.json());
    } catch {
      // The status code still provides safe diagnostic evidence if an error
      // handler cannot serialize a body during dependency failure.
    }

    return { body, status: response.status };
  } catch {
    return null;
  }
}

async function waitForReady(child, baseUrl, timeoutMs, stage) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    assertApiRunning(child, stage);
    const readiness = await readProbe(`${baseUrl}/api/v1/health/ready`);

    if (
      readiness?.status === 200 &&
      readiness.body?.status === 'ready' &&
      readiness.body?.database === 'available'
    ) {
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  fail(`API did not reach PostgreSQL-backed readiness during ${stage}.`);
}

async function verifyOutageState(child, baseUrl) {
  const deadline = Date.now() + OUTAGE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    assertApiRunning(child, 'the PostgreSQL outage');

    const liveness = await readProbe(`${baseUrl}/api/v1/health/live`);
    const readiness = await readProbe(`${baseUrl}/api/v1/health/ready`);

    if (
      liveness?.status === 200 &&
      liveness.body?.status === 'ok' &&
      liveness.body?.service === 'attravoya-api' &&
      readiness?.status === 503
    ) {
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  fail('API did not preserve liveness and withdraw readiness during the PostgreSQL outage.');
}

async function stopApi(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;

  const exitPromise = once(child, 'exit');
  if (!child.kill('SIGTERM')) {
    fail('Failed to send SIGTERM to the API process.');
  }

  let timeout;
  try {
    const [code, signal] = await Promise.race([
      exitPromise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('API process exceeded the shutdown deadline.')),
          STOP_TIMEOUT_MS,
        );
      }),
    ]);

    if (code !== 0 || signal !== null) {
      fail(`API process did not complete graceful shutdown cleanly (code=${code}, signal=${signal}).`);
    }
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

async function main() {
  const contract = parseSafetyContract();
  verifyDatabaseContainer(contract.databaseContainerId);

  let apiProcess = null;
  let databaseStopped = false;

  try {
    apiProcess = startApi(contract);
    await waitForReady(apiProcess, contract.baseUrl, START_TIMEOUT_MS, 'initial startup');
    console.log('API reached PostgreSQL-backed readiness before the outage.');

    runDocker(['stop', '--time', '10', contract.databaseContainerId]);
    databaseStopped = true;
    await verifyOutageState(apiProcess, contract.baseUrl);
    console.log('API remained live and withdrew readiness during the PostgreSQL outage.');

    runDocker(['start', contract.databaseContainerId]);
    databaseStopped = false;
    await waitForReady(apiProcess, contract.baseUrl, RECOVERY_TIMEOUT_MS, 'database recovery');
    console.log('The same API process regained readiness after PostgreSQL recovered.');

    await stopApi(apiProcess);
    apiProcess = null;
    console.log('API database-outage recovery contract passed.');
  } finally {
    if (databaseStopped) {
      runDocker(['start', contract.databaseContainerId]);
    }
    if (apiProcess && apiProcess.exitCode === null && apiProcess.signalCode === null) {
      apiProcess.kill('SIGKILL');
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(`API database-outage recovery check failed: ${error.message}`);
  process.exitCode = 1;
}
