-- Independent geographic selections coexist with existing published destination references.
ALTER TABLE "TravelPlanRequest"
  ADD COLUMN "destinationCityName" TEXT,
  ADD COLUMN "destinationCountryCode" VARCHAR(2);
