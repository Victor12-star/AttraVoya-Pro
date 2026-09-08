# Phase 9N — Accommodation budget range

## Product behavior

The budget planner lets a traveller choose a lodging search range from **cheapest possible** through **premium / luxury**, or compare all supported lodging types. The saved planner request can also carry a maximum nightly amount, maximum total accommodation amount, and room/stay type.

Cheap-search presets deliberately include hostels, budget hotels, guest houses, bed & breakfasts, campsites, and holiday parks so the planner can preserve a tight total trip budget instead of assuming hotel-only lodging.

Premium preferences include hotels, resorts, villas, and serviced apartments. An official star rating such as **5-star** must never be inferred from a property name, place category, price, or comfort preference.

## Pricing truthfulness

The current Geoapify integration is a location-discovery fallback. It does **not** provide live room prices, room availability, or verified hotel star ratings. The UI therefore treats nightly and total accommodation amounts as traveller spending limits, not hotel quotes.

Live room prices, availability, and official star ratings may be displayed only when an authorized accommodation inventory/pricing provider supplies and verifies those fields through a provider-neutral AttraVoya contract.

## Property photo truthfulness

Accommodation results support a provider-neutral property-media gallery for real exterior, room, bed, bathroom, interior, and other property views. Each accepted photo uses an HTTP(S) provider URL and may retain its provider and attribution text so the user can understand the image source.

Geoapify does **not** provide the property-specific room-media contract used by AttraVoya, so Geoapify results deliberately return an empty photo list. The UI shows that property photos are unavailable from the current provider instead of substituting destination stock photography or presenting unrelated images as a particular hotel, hostel, guest house, apartment, campsite, or resort.

When an authorized accommodation provider supplies property-specific licensed photos, the existing accommodation UI can display the real exterior/whole-property image and open a gallery containing the supplied room, bed, bathroom, and interior views. Unsafe or malformed non-HTTP(S) image URLs are rejected in the browser before rendering.

## Planner flow

`TravelStayPreference` already persists `types`, `unitType`, `maxNightlyAmount`, and `maxTotalStayAmount`. The affordability evidence gate already forwards the saved accommodation preference to provider-side cost collectors. Phase 9N exposes those existing capabilities in the production budget-planner UI without inventing market data.
