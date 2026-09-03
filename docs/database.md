# Database architecture

AttraVoya Pro uses PostgreSQL through Prisma. The database is designed around four boundaries: identity/access, global travel reference data, budget-first trip planning, and platform governance.

## Identity and access

`User` stores account identity and a password hash. Profile preferences live in `UserProfile` so authentication data is not mixed with optional travel preferences. Roles and permissions use join tables (`UserRole` and `RolePermission`) because administrative permissions must remain independent from a traveller's Free/Premium subscription.

Premium is modeled with `Plan`, `Entitlement`, `PlanEntitlement`, and `Subscription`. Basic emergency functionality is deliberately not represented as a Premium entitlement.

Authentication tokens are stored only as hashes in `AuthSession`, `EmailVerificationToken`, and `PasswordResetToken`. A database leak should not reveal reusable raw tokens.

## Global travel reference data

`Country`, `Language`, `Currency`, `CountryLanguage`, and `CountryCurrency` support global country coverage without assuming that one country has exactly one language or currency. `City`, `Destination`, and `Airport` provide the stable internal references used by provider integrations and trip planning.

The UI localization layer will use ISO codes and locale data rather than manually hard-coding a small country list.

## Budget-first planning

Budget planning is a core AttraVoya domain, not a frontend calculator.

`TravelPlanRequest` stores what the traveller can afford and what kind of trip they want. A target destination is optional, which supports both:

- "Plan Barcelona for my budget."
- "I have 20,000 SEK; show me where my family can realistically go."

`TravelPlanRecommendation` stores ranked destination candidates with separate budget, family, weather, and overall fit scores. The recommendation stores a range rather than pretending every component is an exact live price.

`BudgetPlan` is versioned. Recalculating a trip after changing dates, accommodation, transport, or activities creates a new scenario instead of silently destroying the previous calculation.

`BudgetLine` stores each cost category together with its pricing basis (`LIVE`, `VERIFIED_PRICE`, `ESTIMATE`, etc.), confidence, provider provenance, and fetch time. This is the foundation for showing users which numbers are live and which are estimates.

`TripExpense` records actual spend during a trip. Comparing actual expenses with the current `BudgetPlan` enables the future Budget Guard to warn users early and suggest cheaper alternatives before they exceed their total budget.


### Accommodation choice and whole-trip value

`TravelStayPreference` stores what the traveller actually wants from lodging rather than assuming every trip is a hotel stay. It can represent hotels, guest houses, bed & breakfasts, hostels, serviced apartments, aparthotels, short-term rentals, vacation homes, resorts, villas, cottages, campsites, and holiday parks. Required and preferred values are separated so the planner can respect must-haves without discarding a good trip because of a soft preference.

Core preferences include room/privacy type, breakfast, kitchen, private bathroom, required/preferred amenities, family suitability, long-stay suitability, nightly/total stay limits, and the places the traveller wants to stay near.

`AccommodationOption` is a planning snapshot rather than a copy of a provider catalogue. It preserves provider provenance and can compare nightly/stay cost with estimated food and local-transport impact. This supports an important AttraVoya rule: **the cheapest room is not automatically the cheapest trip**. A slightly more expensive apartment with a kitchen and better location may have a lower effective trip cost than a cheaper remote hotel.

## Safety data

`EmergencyRecord` stores authoritative emergency information with source URL, verification status, verification date, and verifier. AI-generated emergency numbers must never be inserted as a fallback.

## Platform governance

`FeatureFlag` provides runtime feature control. `ProviderStatus` stores only configuration/health state and never API credentials. `AdminAuditLog` is append-only at the application layer and records sensitive administrative actions without storing secrets.

## Seed policy

The seed script creates only stable platform configuration:

- roles and permissions;
- Free/Premium plans;
- Premium entitlements;
- feature flags.

It does not insert fake users, trips, travel prices, provider results, destinations, or emergency numbers.
