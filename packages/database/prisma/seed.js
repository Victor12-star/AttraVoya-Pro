/**
 * Seed only stable platform reference/configuration data.
 *
 * Deliberately NOT seeded here:
 * - fake users
 * - fake trips
 * - fake prices
 * - fake emergency numbers
 * - fake travel provider results
 *
 * Travel and safety data must come from real providers or verified sources.
 */
import {
  DEFAULT_ENABLED_FLAGS,
  ENTITLEMENTS,
  ENTITLEMENT_LABELS,
  FEATURE_FLAGS,
  PERMISSIONS,
  PERMISSION_LABELS,
  PLANS,
  ROLES,
} from '@attravoya/constants';

import {
  COUNTRY_REFERENCE,
  LANGUAGE_REFERENCE,
  UI_LOCALES,
  getCurrencyMetadata,
} from '@attravoya/localization';

import { prisma } from '../src/client.js';

const ROLE_LABELS = Object.freeze({
  [ROLES.USER]: 'User',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.USER]: [PERMISSIONS.DESTINATIONS_READ, PERMISSIONS.EMERGENCY_READ],
  [ROLES.ADMIN]: Object.values(PERMISSIONS).filter(
    (permission) => permission !== PERMISSIONS.ROLES_WRITE,
  ),
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
});

async function seedGlobalLocalizationReference() {
  const supportedUiLocales = new Set(UI_LOCALES.map(({ code }) => code));
  const languageByCode = new Map();
  const currencyByCode = new Map();

  // Country/language/currency reference data is safe seed data: it describes
  // stable platform metadata rather than inventing travel prices or availability.
  for (const language of LANGUAGE_REFERENCE) {
    // Database columns require a stable human-readable name. Some upstream
    // locale datasets can omit an English display name for regional language
    // codes, so fall back safely instead of allowing seed data to become null.
    const languageName = language.name || language.nativeName || language.code.toUpperCase();
    const nativeName = language.nativeName || languageName;

    const record = await prisma.language.upsert({
      where: { code: language.code },
      update: {
        name: languageName,
        nativeName,
        direction: language.direction,
        isUiSupported: supportedUiLocales.has(language.code),
      },
      create: {
        code: language.code,
        name: languageName,
        nativeName,
        direction: language.direction,
        isUiSupported: supportedUiLocales.has(language.code),
      },
    });
    languageByCode.set(language.code, record);
  }

  const currencyCodes = new Set(COUNTRY_REFERENCE.flatMap((country) => country.currencyCodes));

  for (const code of currencyCodes) {
    const metadata = getCurrencyMetadata(code, 'en');
    if (!metadata) continue;

    // Intl metadata can be typed as nullable even though valid ISO currency
    // codes normally resolve. Persist a stable fallback instead of allowing
    // reference-data seeding to depend on a particular runtime's ICU dataset.
    const currencyName = metadata.name ?? code;
    const currencySymbol = metadata.symbol ?? code;

    const currency = await prisma.currency.upsert({
      where: { code },
      update: {
        name: currencyName,
        symbol: currencySymbol,
        decimalDigits: metadata.decimalDigits,
      },
      create: {
        code,
        name: currencyName,
        symbol: currencySymbol,
        decimalDigits: metadata.decimalDigits,
      },
    });
    currencyByCode.set(code, currency);
  }

  for (const reference of COUNTRY_REFERENCE) {
    const country = await prisma.country.upsert({
      where: { iso2: reference.iso2 },
      update: {
        iso3: reference.iso3,
        name: reference.name,
        defaultTimeZone: reference.defaultTimeZone,
      },
      create: {
        iso2: reference.iso2,
        iso3: reference.iso3,
        name: reference.name,
        defaultTimeZone: reference.defaultTimeZone,
      },
    });

    for (const [rank, languageReference] of reference.languages.entries()) {
      const language = languageByCode.get(languageReference.code);
      if (!language) continue;

      await prisma.countryLanguage.upsert({
        where: {
          countryId_languageId: {
            countryId: country.id,
            languageId: language.id,
          },
        },
        update: {
          isOfficial: languageReference.isOfficial || languageReference.isRegionalOfficial,
          isCommon:
            languageReference.isOfficial ||
            languageReference.isRegionalOfficial ||
            languageReference.populationPercent >= 20,
          rank: rank + 1,
        },
        create: {
          countryId: country.id,
          languageId: language.id,
          isOfficial: languageReference.isOfficial || languageReference.isRegionalOfficial,
          isCommon:
            languageReference.isOfficial ||
            languageReference.isRegionalOfficial ||
            languageReference.populationPercent >= 20,
          rank: rank + 1,
        },
      });
    }

    for (const [index, currencyCode] of reference.currencyCodes.entries()) {
      const currency = currencyByCode.get(currencyCode);
      if (!currency) continue;

      await prisma.countryCurrency.upsert({
        where: {
          countryId_currencyId: {
            countryId: country.id,
            currencyId: currency.id,
          },
        },
        update: { isPrimary: index === 0 },
        create: {
          countryId: country.id,
          currencyId: currency.id,
          isPrimary: index === 0,
        },
      });
    }
  }
}

async function seedRolesAndPermissions() {
  const permissionByKey = new Map();

  for (const key of Object.values(PERMISSIONS)) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { name: PERMISSION_LABELS[key] ?? key },
      create: { key, name: PERMISSION_LABELS[key] ?? key },
    });
    permissionByKey.set(key, permission);
  }

  for (const key of Object.values(ROLES)) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name: ROLE_LABELS[key] ?? key, isSystem: true },
      create: { key, name: ROLE_LABELS[key] ?? key, isSystem: true },
    });

    for (const permissionKey of ROLE_PERMISSIONS[key] ?? []) {
      const permission = permissionByKey.get(permissionKey);
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function seedPlansAndEntitlements() {
  const freePlan = await prisma.plan.upsert({
    where: { key: PLANS.FREE },
    update: { name: 'Free', isActive: true },
    create: {
      key: PLANS.FREE,
      name: 'Free',
      description: 'Core AttraVoya travel planning and safety experience.',
    },
  });

  const proMonthlyPlan = await prisma.plan.upsert({
    where: { key: PLANS.PRO_MONTHLY },
    update: { name: 'Pro Monthly', isActive: true },
    create: {
      key: PLANS.PRO_MONTHLY,
      name: 'Pro Monthly',
      description: 'AttraVoya Pro capabilities billed monthly when billing launches.',
    },
  });

  const proYearlyPlan = await prisma.plan.upsert({
    where: { key: PLANS.PRO_YEARLY },
    update: { name: 'Pro Yearly', isActive: true },
    create: {
      key: PLANS.PRO_YEARLY,
      name: 'Pro Yearly',
      description: 'AttraVoya Pro capabilities billed yearly when billing launches.',
    },
  });

  // The old generic PREMIUM key predates the agreed monthly/yearly commercial
  // structure. Keep any existing row for referential integrity but prevent it
  // from granting new access. Billing is not enabled by this seed.
  await prisma.plan.updateMany({
    where: { key: PLANS.PREMIUM },
    data: { name: 'Premium (legacy)', isActive: false },
  });

  const proPlans = [proMonthlyPlan, proYearlyPlan];

  // Basic account security and emergency/safety capabilities are intentionally
  // absent here because they must remain available without a Pro subscription.
  for (const key of Object.values(ENTITLEMENTS)) {
    const entitlement = await prisma.entitlement.upsert({
      where: { key },
      update: { name: ENTITLEMENT_LABELS[key] ?? key },
      create: { key, name: ENTITLEMENT_LABELS[key] ?? key },
    });

    for (const proPlan of proPlans) {
      await prisma.planEntitlement.upsert({
        where: {
          planId_entitlementId: {
            planId: proPlan.id,
            entitlementId: entitlement.id,
          },
        },
        update: {},
        create: {
          planId: proPlan.id,
          entitlementId: entitlement.id,
        },
      });
    }
  }

  // Keep the Free plan present even though its core capabilities are not
  // modeled as Pro entitlements.
  void freePlan;
}

async function seedFeatureFlags() {
  const defaultEnabled = /** @type {Set<string>} */ (new Set(DEFAULT_ENABLED_FLAGS));

  for (const key of Object.values(FEATURE_FLAGS)) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: {},
      create: {
        key,
        enabled: defaultEnabled.has(key),
      },
    });
  }
}

async function main() {
  await seedGlobalLocalizationReference();
  await seedRolesAndPermissions();
  await seedPlansAndEntitlements();
  await seedFeatureFlags();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Database seed failed.');
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
