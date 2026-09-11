-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DestinationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmergencyVerificationStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'STALE', 'REJECTED');

-- CreateEnum
CREATE TYPE "EmergencyServiceType" AS ENUM ('GENERAL_EMERGENCY', 'POLICE', 'FIRE', 'AMBULANCE', 'MEDICAL', 'TOURIST_POLICE', 'COAST_GUARD', 'POISON_CONTROL', 'OTHER');

-- CreateEnum
CREATE TYPE "PlannerRequestStatus" AS ENUM ('DRAFT', 'SEARCHING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TravelComfortLevel" AS ENUM ('BUDGET', 'VALUE', 'COMFORT', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BudgetConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BudgetFitStatus" AS ENUM ('COMFORTABLE', 'TIGHT', 'OVER_BUDGET', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "PricingBasis" AS ENUM ('LIVE', 'VERIFIED_PRICE', 'ESTIMATE', 'USER_ENTERED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('HOTEL', 'BUDGET_HOTEL', 'GUEST_HOUSE', 'BED_AND_BREAKFAST', 'HOSTEL', 'SERVICED_APARTMENT', 'APARTHOTEL', 'SHORT_TERM_RENTAL', 'VACATION_HOME', 'RESORT', 'VILLA', 'COTTAGE', 'CAMPSITE', 'HOLIDAY_PARK', 'OTHER');

-- CreateEnum
CREATE TYPE "StayUnitType" AS ENUM ('ENTIRE_PLACE', 'PRIVATE_ROOM', 'SHARED_ROOM', 'ANY');

-- CreateEnum
CREATE TYPE "StayPreferenceLevel" AS ENUM ('NOT_REQUIRED', 'PREFERRED', 'REQUIRED');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('FLIGHTS', 'ACCOMMODATION', 'FOOD', 'LOCAL_TRANSPORT', 'ACTIVITIES', 'CHILDREN_ACTIVITIES', 'AIRPORT_TRANSFER', 'TRAVEL_INSURANCE', 'SAFETY_RESERVE', 'OTHER');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TravellerType" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "TripItemCategory" AS ENUM ('FLIGHT', 'ACCOMMODATION', 'RESTAURANT', 'ATTRACTION', 'FAMILY_ACTIVITY', 'BEACH', 'SHOPPING', 'TRANSPORT', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "RecentSearchType" AS ENUM ('DESTINATION', 'FLIGHT', 'ACCOMMODATION', 'BUDGET_TRIP');

-- CreateEnum
CREATE TYPE "FavoriteResourceType" AS ENUM ('DESTINATION', 'ACCOMMODATION', 'RESTAURANT', 'ATTRACTION', 'BEACH', 'FAMILY_ACTIVITY', 'EVENT', 'FLIGHT', 'ITINERARY', 'OTHER');

-- CreateEnum
CREATE TYPE "ProviderHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'NOT_CONFIGURED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "preferredCountryId" TEXT,
    "preferredLanguageId" TEXT,
    "preferredCurrencyId" TEXT,
    "travelInterests" TEXT[],
    "dietaryPreferences" TEXT[],
    "accessibilityPrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEntitlement" (
    "planId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,

    CONSTRAINT "PlanEntitlement_pkey" PRIMARY KEY ("planId","entitlementId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT,
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "iso2" CHAR(2) NOT NULL,
    "iso3" CHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "callingCode" TEXT,
    "region" TEXT,
    "subregion" TEXT,
    "defaultTimeZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ltr',
    "isUiSupported" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" CHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "decimalDigits" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryLanguage" (
    "countryId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER,

    CONSTRAINT "CountryLanguage_pkey" PRIMARY KEY ("countryId","languageId")
);

-- CreateTable
CREATE TABLE "CountryCurrency" (
    "countryId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CountryCurrency_pkey" PRIMARY KEY ("countryId","currencyId")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "regionName" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "timeZone" TEXT,
    "geoProvider" TEXT,
    "geoExternalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "DestinationStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "heroImageUrl" TEXT,
    "heroImageProvider" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "cityId" TEXT,
    "name" TEXT NOT NULL,
    "iataCode" CHAR(3),
    "icaoCode" CHAR(4),
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "timeZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelPlanRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "originCityId" TEXT,
    "originAirportId" TEXT,
    "originLabel" TEXT NOT NULL,
    "targetDestinationId" TEXT,
    "earliestDeparture" DATE,
    "latestReturn" DATE,
    "fixedDeparture" DATE,
    "fixedReturn" DATE,
    "minNights" INTEGER NOT NULL DEFAULT 2,
    "maxNights" INTEGER NOT NULL DEFAULT 14,
    "flexibleDates" BOOLEAN NOT NULL DEFAULT true,
    "budgetAmount" DECIMAL(12,2) NOT NULL,
    "budgetCurrencyId" TEXT NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "childrenAges" INTEGER[],
    "interests" TEXT[],
    "comfortLevel" "TravelComfortLevel" NOT NULL DEFAULT 'VALUE',
    "safetyReservePercent" DECIMAL(5,2) NOT NULL DEFAULT 7.50,
    "status" "PlannerRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelPlanRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelStayPreference" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "types" "AccommodationType"[],
    "unitType" "StayUnitType" NOT NULL DEFAULT 'ANY',
    "breakfast" "StayPreferenceLevel" NOT NULL DEFAULT 'NOT_REQUIRED',
    "kitchen" "StayPreferenceLevel" NOT NULL DEFAULT 'NOT_REQUIRED',
    "privateBathroom" "StayPreferenceLevel" NOT NULL DEFAULT 'NOT_REQUIRED',
    "requiredAmenities" TEXT[],
    "preferredAmenities" TEXT[],
    "nearPriorities" TEXT[],
    "maxNightlyAmount" DECIMAL(12,2),
    "maxTotalStayAmount" DECIMAL(12,2),
    "longStayFriendly" BOOLEAN NOT NULL DEFAULT false,
    "familyFriendly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelStayPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelPlanRecommendation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "overallFitScore" INTEGER NOT NULL,
    "budgetFitScore" INTEGER NOT NULL,
    "familyFitScore" INTEGER,
    "weatherFitScore" INTEGER,
    "estimatedTotalMin" DECIMAL(12,2) NOT NULL,
    "estimatedTotalMax" DECIMAL(12,2) NOT NULL,
    "remainingBudgetMin" DECIMAL(12,2) NOT NULL,
    "remainingBudgetMax" DECIMAL(12,2) NOT NULL,
    "confidence" "BudgetConfidence" NOT NULL,
    "budgetFitStatus" "BudgetFitStatus" NOT NULL,
    "dataCompletenessPct" INTEGER NOT NULL,
    "summary" TEXT,
    "explanation" JSONB,
    "sourceDataUpdatedAt" TIMESTAMP(3),
    "selectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelPlanRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetPlan" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT,
    "tripId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "totalMin" DECIMAL(12,2) NOT NULL,
    "totalMax" DECIMAL(12,2) NOT NULL,
    "reserveAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccommodationOption" (
    "id" TEXT NOT NULL,
    "budgetPlanId" TEXT NOT NULL,
    "currencyId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccommodationType" NOT NULL,
    "unitType" "StayUnitType",
    "pricingBasis" "PricingBasis" NOT NULL,
    "confidence" "BudgetConfidence" NOT NULL,
    "nightlyMin" DECIMAL(12,2),
    "nightlyMax" DECIMAL(12,2),
    "stayTotalMin" DECIMAL(12,2),
    "stayTotalMax" DECIMAL(12,2),
    "estimatedFoodImpactMin" DECIMAL(12,2),
    "estimatedFoodImpactMax" DECIMAL(12,2),
    "estimatedTransportMin" DECIMAL(12,2),
    "estimatedTransportMax" DECIMAL(12,2),
    "effectiveTripCostMin" DECIMAL(12,2),
    "effectiveTripCostMax" DECIMAL(12,2),
    "breakfastIncluded" BOOLEAN,
    "breakfastAvailable" BOOLEAN,
    "kitchen" BOOLEAN,
    "privateBathroom" BOOLEAN,
    "familyFriendly" BOOLEAN,
    "longStayFriendly" BOOLEAN,
    "cancellationSummary" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "distanceToPriorityKm" DECIMAL(8,3),
    "sourceFetchedAt" TIMESTAMP(3),
    "selectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccommodationOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "budgetPlanId" TEXT NOT NULL,
    "category" "BudgetCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "amountMin" DECIMAL(12,2) NOT NULL,
    "amountMax" DECIMAL(12,2) NOT NULL,
    "pricingBasis" "PricingBasis" NOT NULL,
    "confidence" "BudgetConfidence" NOT NULL,
    "sourceProvider" TEXT,
    "sourceExternalId" TEXT,
    "sourceFetchedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "sourceRecommendationId" TEXT,
    "title" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "budgetLimit" DECIMAL(12,2),
    "budgetCurrencyId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripTraveller" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "type" "TravellerType" NOT NULL,
    "ageAtStart" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripTraveller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripItem" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "category" "TripItemCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "locationName" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "provider" TEXT,
    "externalId" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripExpense" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "category" "BudgetCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecentSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RecentSearchType" NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "criteria" JSONB NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceType" "FavoriteResourceType" NOT NULL,
    "resourceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "internalId" TEXT,
    "provider" TEXT,
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyRecord" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "regionName" TEXT,
    "service" "EmergencyServiceType" NOT NULL,
    "serviceLabel" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "EmergencyVerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "lastVerifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderStatus" (
    "id" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "configured" BOOLEAN NOT NULL DEFAULT false,
    "health" "ProviderHealthStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "statusMessage" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "requestId" TEXT,
    "ipHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_key_key" ON "Entitlement"("key");

-- CreateIndex
CREATE INDEX "PlanEntitlement_entitlementId_idx" ON "PlanEntitlement"("entitlementId");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Subscription_externalSubscriptionId_idx" ON "Subscription"("externalSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_usedAt_idx" ON "EmailVerificationToken"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_usedAt_idx" ON "PasswordResetToken"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Country_iso2_key" ON "Country"("iso2");

-- CreateIndex
CREATE UNIQUE INDEX "Country_iso3_key" ON "Country"("iso3");

-- CreateIndex
CREATE INDEX "Country_region_idx" ON "Country"("region");

-- CreateIndex
CREATE INDEX "Country_name_idx" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- CreateIndex
CREATE INDEX "Language_isUiSupported_idx" ON "Language"("isUiSupported");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "CountryLanguage_languageId_idx" ON "CountryLanguage"("languageId");

-- CreateIndex
CREATE INDEX "CountryCurrency_currencyId_idx" ON "CountryCurrency"("currencyId");

-- CreateIndex
CREATE INDEX "City_countryId_normalizedName_idx" ON "City"("countryId", "normalizedName");

-- CreateIndex
CREATE INDEX "City_geoProvider_geoExternalId_idx" ON "City"("geoProvider", "geoExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "City_countryId_slug_key" ON "City"("countryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_cityId_key" ON "Destination"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE INDEX "Destination_status_publishedAt_idx" ON "Destination"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_iataCode_key" ON "Airport"("iataCode");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_icaoCode_key" ON "Airport"("icaoCode");

-- CreateIndex
CREATE INDEX "Airport_countryId_idx" ON "Airport"("countryId");

-- CreateIndex
CREATE INDEX "Airport_cityId_idx" ON "Airport"("cityId");

-- CreateIndex
CREATE INDEX "TravelPlanRequest_userId_createdAt_idx" ON "TravelPlanRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TravelPlanRequest_status_createdAt_idx" ON "TravelPlanRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TravelPlanRequest_targetDestinationId_idx" ON "TravelPlanRequest"("targetDestinationId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelStayPreference_requestId_key" ON "TravelStayPreference"("requestId");

-- CreateIndex
CREATE INDEX "TravelStayPreference_longStayFriendly_familyFriendly_idx" ON "TravelStayPreference"("longStayFriendly", "familyFriendly");

-- CreateIndex
CREATE INDEX "TravelPlanRecommendation_destinationId_idx" ON "TravelPlanRecommendation"("destinationId");

-- CreateIndex
CREATE INDEX "TravelPlanRecommendation_overallFitScore_idx" ON "TravelPlanRecommendation"("overallFitScore");

-- CreateIndex
CREATE UNIQUE INDEX "TravelPlanRecommendation_requestId_destinationId_key" ON "TravelPlanRecommendation"("requestId", "destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelPlanRecommendation_requestId_rank_key" ON "TravelPlanRecommendation"("requestId", "rank");

-- CreateIndex
CREATE INDEX "BudgetPlan_tripId_isCurrent_idx" ON "BudgetPlan"("tripId", "isCurrent");

-- CreateIndex
CREATE INDEX "BudgetPlan_recommendationId_isCurrent_idx" ON "BudgetPlan"("recommendationId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetPlan_recommendationId_version_key" ON "BudgetPlan"("recommendationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetPlan_tripId_version_key" ON "BudgetPlan"("tripId", "version");

-- CreateIndex
CREATE INDEX "AccommodationOption_budgetPlanId_effectiveTripCostMin_idx" ON "AccommodationOption"("budgetPlanId", "effectiveTripCostMin");

-- CreateIndex
CREATE INDEX "AccommodationOption_provider_externalId_idx" ON "AccommodationOption"("provider", "externalId");

-- CreateIndex
CREATE INDEX "AccommodationOption_type_familyFriendly_longStayFriendly_idx" ON "AccommodationOption"("type", "familyFriendly", "longStayFriendly");

-- CreateIndex
CREATE UNIQUE INDEX "AccommodationOption_budgetPlanId_provider_externalId_key" ON "AccommodationOption"("budgetPlanId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "BudgetLine_budgetPlanId_category_idx" ON "BudgetLine"("budgetPlanId", "category");

-- CreateIndex
CREATE INDEX "BudgetLine_sourceProvider_sourceExternalId_idx" ON "BudgetLine"("sourceProvider", "sourceExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_sourceRecommendationId_key" ON "Trip"("sourceRecommendationId");

-- CreateIndex
CREATE INDEX "Trip_userId_startDate_idx" ON "Trip"("userId", "startDate");

-- CreateIndex
CREATE INDEX "Trip_userId_status_idx" ON "Trip"("userId", "status");

-- CreateIndex
CREATE INDEX "Trip_destinationId_idx" ON "Trip"("destinationId");

-- CreateIndex
CREATE INDEX "TripTraveller_tripId_type_idx" ON "TripTraveller"("tripId", "type");

-- CreateIndex
CREATE INDEX "TripItem_tripId_date_sortOrder_idx" ON "TripItem"("tripId", "date", "sortOrder");

-- CreateIndex
CREATE INDEX "TripItem_provider_externalId_idx" ON "TripItem"("provider", "externalId");

-- CreateIndex
CREATE INDEX "TripExpense_tripId_occurredAt_idx" ON "TripExpense"("tripId", "occurredAt");

-- CreateIndex
CREATE INDEX "TripExpense_tripId_category_idx" ON "TripExpense"("tripId", "category");

-- CreateIndex
CREATE INDEX "RecentSearch_userId_lastUsedAt_idx" ON "RecentSearch"("userId", "lastUsedAt");

-- CreateIndex
CREATE INDEX "RecentSearch_userId_type_lastUsedAt_idx" ON "RecentSearch"("userId", "type", "lastUsedAt");

-- CreateIndex
CREATE INDEX "Favorite_userId_resourceType_createdAt_idx" ON "Favorite"("userId", "resourceType", "createdAt");

-- CreateIndex
CREATE INDEX "Favorite_provider_externalId_idx" ON "Favorite"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_resourceKey_key" ON "Favorite"("userId", "resourceKey");

-- CreateIndex
CREATE INDEX "EmergencyRecord_countryId_status_service_idx" ON "EmergencyRecord"("countryId", "status", "service");

-- CreateIndex
CREATE INDEX "EmergencyRecord_status_lastVerifiedAt_idx" ON "EmergencyRecord"("status", "lastVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderStatus_providerKey_key" ON "ProviderStatus"("providerKey");

-- CreateIndex
CREATE INDEX "ProviderStatus_category_health_idx" ON "ProviderStatus"("category", "health");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_resourceType_resourceId_createdAt_idx" ON "AdminAuditLog"("resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_requestId_idx" ON "AdminAuditLog"("requestId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_preferredCountryId_fkey" FOREIGN KEY ("preferredCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_preferredLanguageId_fkey" FOREIGN KEY ("preferredLanguageId") REFERENCES "Language"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_preferredCurrencyId_fkey" FOREIGN KEY ("preferredCurrencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "Entitlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryLanguage" ADD CONSTRAINT "CountryLanguage_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryLanguage" ADD CONSTRAINT "CountryLanguage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryCurrency" ADD CONSTRAINT "CountryCurrency_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryCurrency" ADD CONSTRAINT "CountryCurrency_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlanRequest" ADD CONSTRAINT "TravelPlanRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlanRequest" ADD CONSTRAINT "TravelPlanRequest_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlanRequest" ADD CONSTRAINT "TravelPlanRequest_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlanRequest" ADD CONSTRAINT "TravelPlanRequest_targetDestinationId_fkey" FOREIGN KEY ("targetDestinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlanRequest" ADD CONSTRAINT "TravelPlanRequest_budgetCurrencyId_fkey" FOREIGN KEY ("budgetCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelStayPreference" ADD CONSTRAINT "TravelStayPreference_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TravelPlanRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlanRecommendation" ADD CONSTRAINT "TravelPlanRecommendation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TravelPlanRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlanRecommendation" ADD CONSTRAINT "TravelPlanRecommendation_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "TravelPlanRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationOption" ADD CONSTRAINT "AccommodationOption_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "BudgetPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationOption" ADD CONSTRAINT "AccommodationOption_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "BudgetPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_sourceRecommendationId_fkey" FOREIGN KEY ("sourceRecommendationId") REFERENCES "TravelPlanRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_budgetCurrencyId_fkey" FOREIGN KEY ("budgetCurrencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripTraveller" ADD CONSTRAINT "TripTraveller_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripItem" ADD CONSTRAINT "TripItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentSearch" ADD CONSTRAINT "RecentSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRecord" ADD CONSTRAINT "EmergencyRecord_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRecord" ADD CONSTRAINT "EmergencyRecord_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
