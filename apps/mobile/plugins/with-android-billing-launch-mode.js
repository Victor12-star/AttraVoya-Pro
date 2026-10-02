import { withAndroidManifest } from 'expo/config-plugins';

const MAIN_ACTION = 'android.intent.action.MAIN';
const LAUNCHER_CATEGORY = 'android.intent.category.LAUNCHER';
const SAFE_LAUNCH_MODE = 'singleTop';

function hasLauncherIntent(activity) {
  return activity?.['intent-filter']?.some((filter) => {
    const actions = filter?.action ?? [];
    const categories = filter?.category ?? [];

    return (
      actions.some((action) => action?.$?.['android:name'] === MAIN_ACTION) &&
      categories.some((category) => category?.$?.['android:name'] === LAUNCHER_CATEGORY)
    );
  });
}

/**
 * RevenueCat requires the purchase Activity to use standard or singleTop so a
 * Google Play payment verification handoff cannot cancel an in-flight purchase.
 */
export function setAndroidBillingSafeLaunchMode(androidManifest) {
  const application = androidManifest?.manifest?.application?.[0];
  const activities = application?.activity ?? [];
  const launcherActivity = activities.find(hasLauncherIntent);

  if (!launcherActivity?.$) {
    throw new Error('Android billing configuration: launcher Activity was not found.');
  }

  launcherActivity.$['android:launchMode'] = SAFE_LAUNCH_MODE;
  return androidManifest;
}

export default function withAndroidBillingLaunchMode(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    configWithManifest.modResults = setAndroidBillingSafeLaunchMode(
      configWithManifest.modResults,
    );
    return configWithManifest;
  });
}
