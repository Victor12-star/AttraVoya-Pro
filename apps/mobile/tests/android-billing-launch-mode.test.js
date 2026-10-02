import { describe, expect, it } from '@jest/globals';

import { setAndroidBillingSafeLaunchMode } from '../plugins/with-android-billing-launch-mode.js';

function createManifest() {
  return {
    manifest: {
      application: [
        {
          activity: [
            {
              $: {
                'android:name': '.SecondaryActivity',
                'android:launchMode': 'singleTask',
              },
            },
            {
              $: {
                'android:name': '.MainActivity',
                'android:launchMode': 'singleTask',
              },
              'intent-filter': [
                {
                  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
                  category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

describe('Android billing launch mode config plugin', () => {
  it('sets only the launcher Activity to RevenueCat-safe singleTop', () => {
    const manifest = createManifest();

    const result = setAndroidBillingSafeLaunchMode(manifest);

    expect(result.manifest.application[0].activity[0].$['android:launchMode']).toBe('singleTask');
    expect(result.manifest.application[0].activity[1].$['android:launchMode']).toBe('singleTop');
  });

  it('is idempotent when applied more than once', () => {
    const manifest = createManifest();

    setAndroidBillingSafeLaunchMode(manifest);
    setAndroidBillingSafeLaunchMode(manifest);

    expect(manifest.manifest.application[0].activity[1].$['android:launchMode']).toBe('singleTop');
  });

  it('fails closed when the launcher Activity cannot be identified', () => {
    const manifest = {
      manifest: {
        application: [{ activity: [{ $: { 'android:name': '.MainActivity' } }] }],
      },
    };

    expect(() => setAndroidBillingSafeLaunchMode(manifest)).toThrow(
      'Android billing configuration: launcher Activity was not found.',
    );
  });
});
