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

  it('uses remote developer-facing versions with production auto-increment', async () => {
    const configuration = await readEasConfiguration();

    expect(configuration.cli.appVersionSource).toBe('remote');
    expect(configuration.build.production.autoIncrement).toBe(true);
  });

  it('builds production Android as an app bundle for Google Play', async () => {
    const configuration = await readEasConfiguration();

    expect(configuration.build.production.android?.buildType).toBe('app-bundle');
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

  it('keeps RevenueCat and API values out of committed EAS build configuration', async () => {
    const configuration = await readEasConfiguration();
    const serialized = JSON.stringify(configuration);

    expect(serialized).not.toContain('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY');
    expect(serialized).not.toContain('goog_');
    expect(serialized).not.toContain('EXPO_PUBLIC_API_BASE_URL');
  });
});
