# ADR 0002 — Budget-first planning is a core domain

**Status:** Accepted

## Context

Many travel products can produce an itinerary after a user has already selected a destination. AttraVoya Pro should additionally answer a harder question: "Given my origin, total budget, travel party, dates, and interests, where can I realistically go?"

Treating this as a UI calculator would make it difficult to explain data quality, compare scenarios, support families, or keep a traveller within budget during the trip.

## Decision

Budget planning is modeled explicitly in PostgreSQL with `TravelPlanRequest`, `TravelPlanRecommendation`, `BudgetPlan`, `BudgetLine`, and `TripExpense`.

A request may omit a destination. Recommendations carry multiple fit scores and an estimated range. Budget lines record whether a value is live, verified, estimated, user-entered, or unavailable, plus source provenance and confidence.

Budget plans are versioned so a traveller can ask AttraVoya to make a trip cheaper without losing the previous scenario. Actual expenses are stored separately to support a future Budget Guard.

A safety reserve percentage is part of the planning request so the engine does not consume every available unit of currency just to claim a trip fits.

## Consequences

Positive:

- AttraVoya can recommend destinations based on affordability rather than only plan a chosen destination.
- Users can see which costs are live versus estimated.
- Family fit and budget fit can be scored separately.
- Replanning and cheaper-alternative workflows have a stable data model.
- Actual trip spending can later be compared with the plan.

Trade-offs:

- The planner requires normalization across several external providers.
- Price confidence must be maintained honestly; unavailable live data cannot be replaced with fabricated values.
- Versioned plans add data volume, so retention policies may be needed later.
