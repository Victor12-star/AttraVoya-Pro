import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const schemaPath = path.resolve(import.meta.dirname, '../prisma/schema.prisma');
const seedPath = path.resolve(import.meta.dirname, '../prisma/seed.js');
const schema = fs.readFileSync(schemaPath, 'utf8');
const seed = fs.readFileSync(seedPath, 'utf8');

const requiredModels = [
  'User',
  'UserProfile',
  'Role',
  'Permission',
  'Plan',
  'Entitlement',
  'Subscription',
  'Country',
  'Language',
  'Currency',
  'City',
  'Destination',
  'TravelPlanRequest',
  'TravelPlanRecommendation',
  'TravelStayPreference',
  'AccommodationOption',
  'BudgetPlan',
  'BudgetLine',
  'Trip',
  'TripExpense',
  'EmergencyRecord',
  'FeatureFlag',
  'ProviderStatus',
  'AdminAuditLog',
];

describe('database schema guardrails', () => {
  it.each(requiredModels)('contains the %s model', (model) => {
    expect(schema).toContain(`model ${model} {`);
  });

  it('keeps budget planning as a first-class domain', () => {
    expect(schema).toContain('budgetAmount');
    expect(schema).toContain('safetyReservePercent');
    expect(schema).toContain('PricingBasis');
    expect(schema).toContain('BudgetConfidence');
  });

  it('supports provider-neutral accommodation choice and whole-trip cost comparison', () => {
    expect(schema).toContain('enum AccommodationType');
    expect(schema).toContain('GUEST_HOUSE');
    expect(schema).toContain('HOSTEL');
    expect(schema).toContain('SHORT_TERM_RENTAL');
    expect(schema).toContain('breakfast');
    expect(schema).toContain('kitchen');
    expect(schema).toContain('effectiveTripCostMin');
    expect(schema).toContain('estimatedTransportMin');
  });

  it('does not seed fake travel or emergency records', () => {
    expect(seed).not.toMatch(/prisma\.(trip|emergencyRecord|destination)\.create\(/);
  });

  it('keeps provider status separate from provider secrets', () => {
    const providerModel = schema.split('model ProviderStatus {')[1]?.split('\n}')[0] ?? '';
    expect(providerModel).not.toMatch(/apiKey|secret|token/i);
  });
});
