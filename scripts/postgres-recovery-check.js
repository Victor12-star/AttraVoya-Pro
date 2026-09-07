#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const REFERENCE_TABLES = ['Country', 'Language', 'Currency', 'Role', 'Permission', 'Plan'];
const POSTGRES_IMAGE = process.env.POSTGRES_RECOVERY_IMAGE?.trim() || 'postgres:17-alpine';

function fail(message) {
  throw new Error(message);
}

function parseDatabaseUrl() {
  if (process.env.POSTGRES_RECOVERY_TEST !== '1') {
    fail('Refusing recovery drill without POSTGRES_RECOVERY_TEST=1.');
  }

  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) {
    throw new Error('DATABASE_URL is required for the recovery drill.');
  }

  const databaseUrl = new URL(rawUrl);
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    fail('DATABASE_URL must use the postgres or postgresql protocol.');
  }

  if (!LOOPBACK_HOSTS.has(databaseUrl.hostname)) {
    fail('Recovery drill is restricted to a loopback PostgreSQL host.');
  }

  const database = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));
  const user = decodeURIComponent(databaseUrl.username);
  const password = decodeURIComponent(databaseUrl.password);

  if (!database || !user || !password) {
    fail('DATABASE_URL must include a database name, username and password.');
  }

  return {
    database,
    host: databaseUrl.hostname,
    password,
    port: databaseUrl.port || '5432',
    user,
  };
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function main() {
  const connection = parseDatabaseUrl();
  const restoreDatabase = `attravoya_restore_${process.pid}_${Date.now()}`;
  const adminDatabase = connection.database === 'postgres' ? 'template1' : 'postgres';
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'attravoya-recovery-'));
  const backupMount = '/backup';
  const backupFile = `${backupMount}/attravoya-ci.dump`;

  function runPostgresTool(toolArguments, { capture = false, mountBackup = false } = {}) {
    const dockerArguments = ['run', '--rm', '--network', 'host', '-e', 'PGPASSWORD'];
    if (mountBackup) dockerArguments.push('-v', `${temporaryDirectory}:${backupMount}`);
    dockerArguments.push(POSTGRES_IMAGE, ...toolArguments);

    return execFileSync('docker', dockerArguments, {
      encoding: 'utf8',
      env: { ...process.env, PGPASSWORD: connection.password },
      stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    });
  }

  function psql(database, sql) {
    return runPostgresTool(
      [
        'psql',
        '--host',
        connection.host,
        '--port',
        connection.port,
        '--username',
        connection.user,
        '--dbname',
        database,
        '--set',
        'ON_ERROR_STOP=1',
        '--tuples-only',
        '--no-align',
        '--command',
        sql,
      ],
      { capture: true },
    ).trim();
  }

  function dropRestoreDatabase() {
    psql(
      adminDatabase,
      `DROP DATABASE IF EXISTS ${quoteIdentifier(restoreDatabase)} WITH (FORCE);`,
    );
  }

  let failure = null;

  try {
    console.log('Creating a PostgreSQL 17 logical backup from the disposable CI database.');
    runPostgresTool(
      [
        'pg_dump',
        '--host',
        connection.host,
        '--port',
        connection.port,
        '--username',
        connection.user,
        '--dbname',
        connection.database,
        '--format',
        'custom',
        '--no-owner',
        '--no-privileges',
        '--file',
        backupFile,
      ],
      { mountBackup: true },
    );

    dropRestoreDatabase();
    psql(adminDatabase, `CREATE DATABASE ${quoteIdentifier(restoreDatabase)};`);

    console.log('Restoring the backup into an isolated PostgreSQL database.');
    runPostgresTool(
      [
        'pg_restore',
        '--host',
        connection.host,
        '--port',
        connection.port,
        '--username',
        connection.user,
        '--dbname',
        restoreDatabase,
        '--exit-on-error',
        '--no-owner',
        '--no-privileges',
        backupFile,
      ],
      { mountBackup: true },
    );

    const tableCountSql =
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';";
    const sourceTableCount = psql(connection.database, tableCountSql);
    const restoredTableCount = psql(restoreDatabase, tableCountSql);

    if (sourceTableCount !== restoredTableCount || Number(sourceTableCount) <= 0) {
      fail(
        `Restored schema table count mismatch: source=${sourceTableCount}, restored=${restoredTableCount}.`,
      );
    }

    for (const table of REFERENCE_TABLES) {
      const sourceCount = psql(connection.database, `SELECT count(*) FROM ${quoteIdentifier(table)};`);
      const restoredCount = psql(restoreDatabase, `SELECT count(*) FROM ${quoteIdentifier(table)};`);

      if (sourceCount !== restoredCount || Number(sourceCount) <= 0) {
        fail(
          `Restored ${table} row count mismatch: source=${sourceCount}, restored=${restoredCount}.`,
        );
      }
    }

    console.log(
      `PostgreSQL recovery drill passed: ${sourceTableCount} tables and stable reference data restored exactly.`,
    );
  } catch (error) {
    failure = error;
  }

  try {
    dropRestoreDatabase();
  } catch (cleanupError) {
    if (!failure) failure = cleanupError;
    else console.error('Recovery drill cleanup also failed.');
  }

  try {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  } catch (cleanupError) {
    if (!failure) failure = cleanupError;
    else console.error('Recovery drill temporary-file cleanup also failed.');
  }

  if (failure) throw failure;
}

try {
  main();
} catch (error) {
  console.error(`PostgreSQL recovery drill failed: ${error.message}`);
  process.exitCode = 1;
}
