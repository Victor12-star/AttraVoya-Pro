import { describe, expect, it } from '@jest/globals';

import {
  ANDROID_DATA_EXTRACTION_RULES,
  hardenAndroidBackupManifest,
} from '../plugins/with-android-backup-hardening.js';

function createManifest() {
  return {
    manifest: {
      application: [
        {
          $: {
            'android:allowBackup': 'true',
          },
        },
      ],
    },
  };
}

describe('Android backup hardening config plugin', () => {
  it('disables legacy backup and points Android 12+ at explicit extraction rules', () => {
    const manifest = createManifest();

    const result = hardenAndroidBackupManifest(manifest);
    const application = result.manifest.application[0].$;

    expect(application['android:allowBackup']).toBe('false');
    expect(application['android:fullBackupContent']).toBe('false');
    expect(application['android:dataExtractionRules']).toBe('@xml/attravoya_data_extraction_rules');
  });

  it('excludes every supported app-data domain from cloud backup and device transfer', () => {
    for (const section of ['cloud-backup', 'device-transfer']) {
      expect(ANDROID_DATA_EXTRACTION_RULES).toContain(`<${section}>`);
    }

    for (const domain of [
      'root',
      'file',
      'database',
      'sharedpref',
      'external',
      'device_root',
      'device_file',
      'device_database',
      'device_sharedpref',
    ]) {
      const rule = `<exclude domain="${domain}" path="." />`;
      expect(ANDROID_DATA_EXTRACTION_RULES.match(new RegExp(rule, 'g'))).toHaveLength(2);
    }
  });

  it('is idempotent when applied more than once', () => {
    const manifest = createManifest();

    hardenAndroidBackupManifest(manifest);
    hardenAndroidBackupManifest(manifest);

    const application = manifest.manifest.application[0].$;
    expect(application['android:allowBackup']).toBe('false');
    expect(application['android:fullBackupContent']).toBe('false');
    expect(application['android:dataExtractionRules']).toBe('@xml/attravoya_data_extraction_rules');
  });

  it('fails closed when the application node cannot be identified', () => {
    expect(() => hardenAndroidBackupManifest({ manifest: {} })).toThrow(
      'Android backup configuration: application node was not found.',
    );
  });
});
