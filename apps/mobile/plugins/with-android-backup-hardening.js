import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { withAndroidManifest, withDangerousMod } from 'expo/config-plugins';

const DATA_EXTRACTION_RULES_RESOURCE = '@xml/attravoya_data_extraction_rules';

export const ANDROID_DATA_EXTRACTION_RULES = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="root" path="." />
    <exclude domain="file" path="." />
    <exclude domain="database" path="." />
    <exclude domain="sharedpref" path="." />
    <exclude domain="external" path="." />
    <exclude domain="device_root" path="." />
    <exclude domain="device_file" path="." />
    <exclude domain="device_database" path="." />
    <exclude domain="device_sharedpref" path="." />
  </cloud-backup>
  <device-transfer>
    <exclude domain="root" path="." />
    <exclude domain="file" path="." />
    <exclude domain="database" path="." />
    <exclude domain="sharedpref" path="." />
    <exclude domain="external" path="." />
    <exclude domain="device_root" path="." />
    <exclude domain="device_file" path="." />
    <exclude domain="device_database" path="." />
    <exclude domain="device_sharedpref" path="." />
  </device-transfer>
</data-extraction-rules>
`;

export function hardenAndroidBackupManifest(androidManifest) {
  const application = androidManifest?.manifest?.application?.[0];

  if (!application?.$) {
    throw new Error('Android backup configuration: application node was not found.');
  }

  application.$['android:allowBackup'] = 'false';
  application.$['android:fullBackupContent'] = 'false';
  application.$['android:dataExtractionRules'] = DATA_EXTRACTION_RULES_RESOURCE;
  return androidManifest;
}

async function writeAndroidDataExtractionRules(projectRoot) {
  const xmlDirectory = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
  const filePath = path.join(xmlDirectory, 'attravoya_data_extraction_rules.xml');

  await mkdir(xmlDirectory, { recursive: true });
  await writeFile(filePath, ANDROID_DATA_EXTRACTION_RULES, 'utf8');
}

export default function withAndroidBackupHardening(config) {
  const withManifest = withAndroidManifest(config, (configWithManifest) => {
    configWithManifest.modResults = hardenAndroidBackupManifest(configWithManifest.modResults);
    return configWithManifest;
  });

  return withDangerousMod(withManifest, [
    'android',
    async (configWithMod) => {
      await writeAndroidDataExtractionRules(configWithMod.modRequest.projectRoot);
      return configWithMod;
    },
  ]);
}
