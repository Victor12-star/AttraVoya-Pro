# ADR 0003 — Budget intelligence product principles

**Status:** Accepted

AttraVoya Pro should not become another itinerary generator with a budget text field. Budget intelligence must change how destinations, stays, transport, activities, and trip adjustments are recommended.

## 1. Budget-first destination discovery

The traveller may provide no destination at all. The planner can rank realistic destinations from their origin using total available budget, travel dates/flexibility, party composition, interests, and comfort level.

## 2. Protected reserve

The engine should not spend 100% of the user's stated budget merely to make a recommendation fit. A configurable safety/contingency reserve is protected before discretionary spending is allocated.

## 3. Ranges instead of false precision

A total can combine live, verified, estimated, and unavailable components. The UI must show cost ranges and confidence rather than present estimates as exact prices.

Each recommendation therefore has:

- a budget fit status (`COMFORTABLE`, `TIGHT`, `OVER_BUDGET`, or `INSUFFICIENT_DATA`);
- a confidence level;
- a data-completeness percentage;
- source-aware budget lines.

## 4. Real trip cost, not cheapest sticker price

A cheaper hotel can create a more expensive trip if it requires costly daily transport. Recommendation logic should compare accommodation together with the expected cost/time of reaching the places that matter to the traveller.

This principle powers **Stay Near What Matters** and should later consider beach, family activities, nightlife, shopping, airport, public transport, city centre, and custom anchors.

## 5. Family-age-aware planning

Children are represented by ages rather than only a generic traveller count. This allows later provider logic to consider age-appropriate activities, child pricing when actually available, stroller-friendly options, free child activities, and family accommodation needs.

## 6. What-if replanning

When a trip exceeds the budget, the product should propose concrete alternatives instead of simply failing:

- shorten the trip;
- move the dates within the user's flexible window;
- choose a lower-cost destination with a similar experience;
- change accommodation location/type;
- replace taxis with public transport;
- replace selected paid activities with suitable free/low-cost alternatives.

Budget-plan versioning preserves each scenario so changes can be compared.

## 7. Budget Guard during the trip

Actual expenses can be compared against the current plan. The future Budget Guard should warn early when spend is trending above plan and recommend realistic adjustments for the remaining days.

It must not create financial pressure by hiding uncertainty or making unsupported claims.

## 8. Safety is not traded for a lower number

The planner must not rank an option as "best" solely because it is cheapest. Verified emergency information remains free, and the product should expose practical location context instead of pretending that a single simplistic safety score can describe a neighbourhood or destination.

## 9. Explain recommendations

A recommendation should be able to tell the user why it fits, for example:

- strong budget margin;
- good family fit for ages 5 and 9;
- accommodation close to selected activities;
- lower local-transport requirement;
- weather suitable for selected interests;
- some prices are still estimates and need confirmation.

This explanation must be grounded in retrieved data and known calculations, not invented by a language model.
