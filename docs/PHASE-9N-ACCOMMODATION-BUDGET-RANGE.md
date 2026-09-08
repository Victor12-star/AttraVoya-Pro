# Phase 9N — Accommodation budget range

## Product behavior

The budget planner lets a traveller choose a lodging search range from **cheapest possible** through **premium / luxury**, or compare all supported lodging types. The saved planner request can also carry a maximum nightly amount, maximum total accommodation amount, and room/stay type.

Cheap-search presets deliberately include hostels, budget hotels, guest houses, bed & breakfasts, campsites, and holiday parks so the planner can preserve a tight total trip budget instead of assuming hotel-only lodging.

Premium preferences include hotels, resorts, villas, and serviced apartments. An official star rating such as **5-star** must never be inferred from a property name, place category, price, or comfort preference.

## Pricing truthfulness

The current Geoapify integration is a location-discovery fallback. It does **not** provide live room prices, room availability, or verified hotel star ratings. The UI therefore treats nightly and total accommodation amounts as traveller spending limits, not hotel quotes.

Live room prices, availability, and official star ratings may be displayed only when an authorized accommodation inventory/pricing provider supplies and verifies those fields through a provider-neutral AttraVoya contract.

## Planner flow

`TravelStayPreference` already persists `types`, `unitType`, `maxNightlyAmount`, and `maxTotalStayAmount`. The affordability evidence gate already forwards the saved accommodation preference to provider-side cost collectors. Phase 9N exposes those existing capabilities in the production budget-planner UI without inventing market data.
