import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

async function readEasConfiguration() {
  const filePath = path.join(process.cwd(), 'eas.json');
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readMobilePackage() {
  const filePath = path.join(process.cwd(), 'package.json');
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readRootPackage() {
  const filePath = path.join(process.cwd(), '..', '..', 'package.json');
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readAppConfigSource() {
  const filePath = path.join(process.cwd(), 'app.config.js');
  return readFile(filePath, 'utf8');
}

async function readAndroidCleartextPluginSource() {
  const filePath = path.join(
    process.cwd(),
    'plugins',
    'with-android-cleartext-traffic-disabled.js',
  );
  return readFile(filePath, 'utf8');
}

function minimumNodeVersion(engine) {
  const match = typeof engine === 'string' ? engine.match(/^>=(\d+\.\d+\.\d+)\s+</) : null;
  if (!match) throw new TypeError('Root Node engine minimum is invalid.');
  return match[1];
}

describe('mobile EAS environment mapping', () => {
  it('pins every canonical build profile to its matching EAS environment', async () => {
    const configuration = await readEasConfiguration();

    expect(configuration.build.development.environment).toBe('development');
    expect(configuration.build.preview.environment).toBe('preview');
    expect(configuration.build.production.environment).toBe('production');
  });

  it('matches every EAS profile to the repository Node engine minimum', async () => {
    const configuration = await readEasConfiguration();
    const rootPackage = await readRootPackage();
    const expectedNodeVersion = minimumNodeVersion(rootPackage.engines?.node);

    expect(configuration.build.development.node).toBe(expectedNodeVersion);
    expect(configuration.build.preview.node).toBe(expectedNodeVersion);
    expect(configuration.build.production.node).toBe(expectedNodeVersion);
  });

  it('pins EAS CLI to the installed mobile dependency and uses remote versions', async () => {
    const configuration = await readEasConfiguration();
    const mobilePackage = await readMobilePackage();

    expect(configuration.cli.version).toBe(mobilePackage.devDependencies['eas-cli']);
    expect(configuration.cli.requireCommit).toBe(true);
    expect(configuration.cli.appVersionSource).toBe('remote');
    expect(configuration.build.production.autoIncrement).toBe(true);
  });

  it('builds production Android for store distribution with EAS-managed signing credentials', async () => {
    const configuration = await readEasConfiguration();

    expect(configuration.build.production.distribution).toBe('store');
    expect(configuration.build.production.developmentClient).toBe(false);
    expect(configuration.build.production.withoutCredentials).toBe(false);
    expect(configuration.build.production.android?.buildType).toBe('app-bundle');
    expect(configuration.build.production.android?.credentialsSource).toBe('remote');
  });

  it('pins the Google Play application ID to the production Android package', async () => {
    const configuration = await readEasConfiguration();
    const appConfigSource = await readAppConfigSource();
    const packageMatch = appConfigSource.match(/package:\s*'([^']+)'/);

    expect(packageMatch?.[1]).toBeDefined();
    expect(configuration.submit.production.android?.applicationId).toBe(packageMatch?.[1]);
    expect(configuration.submit.production.android?.track).toBe('internal');
    expect(configuration.submit.production.android?.releaseStatus).toBe('draft');
    expect(configuration.submit.production.android?.changesNotSentForReview).toBe(true);
  });

  it('keeps Android local app data out of automatic backups', async () => {
    const appConfigSource = await readAppConfigSource();

    expect(appConfigSource).toContain('allowBackup: false');
  });

  it('blocks Android cleartext traffic at the native manifest boundary', async () => {
    const appConfigSource = await readAppConfigSource();
    const pluginSource = await readAndroidCleartextPluginSource();

    expect(appConfigSource).toContain("'./plugins/with-android-cleartext-traffic-disabled.js'");
    expect(pluginSource).toContain("application.$['android:usesCleartextTraffic'] = 'false'");
  });

  it('keeps Android location foreground-only for Google Play policy', async () => {
    const appConfigSource = await readAppConfigSource();

    expect(appConfigSource).toContain(
      "blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION']",
    );
    expect(appConfigSource).toContain('locationWhenInUsePermission');
    expect(appConfigSource).not.toContain('isAndroidBackgroundLocationEnabled: true');
  });

  it('keeps unused Expo notifications native surface out of production mobile', async () => {
    const mobilePackage = await readMobilePackage();
    const appConfigSource = await readAppConfigSource();

    expect(mobilePackage.dependencies['expo-notifications']).toBeUndefined();
    expect(appConfigSource).not.toContain("'expo-notifications'");
  });

  it('uses an Expo development client for native Android billing tests', async () => {
    const configuration = await readEasConfiguration();

    expect(configuration.build.development.developmentClient).toBe(true);
  });

  it('installs the SDK-compatible Expo development client package', async () => {
    const configuration = await readEasConfiguration();
    const mobilePackage = await readMobilePackage();

    expect(configuration.build.development.developmentClient).toBe(true);
    expect(mobilePackage.dependencies['expo-dev-client']).toBe('~57.0.19');
  });

  it('keeps Google Play service-account paths and public runtime values out of committed EAS config', async () => {
    const configuration = await readEasConfiguration();
    const serialized = JSON.stringify(configuration);

    expect(configuration.submit.production.android?.serviceAccountKeyPath).toBeUndefined();
    expect(serialized).not.toContain('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY');
    expect(serialized).not.toContain('goog_');
    expect(serialized).not.toContain('EXPO_PUBLIC_API_BASE_URL');
  });
});
