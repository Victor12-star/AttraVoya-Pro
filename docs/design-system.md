# AttraVoya Pro design system

## Product direction

The customer experience should feel like a professionally designed travel product, not a generic AI/SaaS template. The visual system combines editorial travel imagery, restrained typography, strong search affordances and practical planning tools. It deliberately avoids decorative gradients, repeated feature-card grids, fake testimonials, fake statistics and AI-generated icons.

Design research is inspiration only. AttraVoya Pro does not copy another product's source code, branding, proprietary assets or exact layouts.

## Brand character

- trustworthy and safety-aware;
- warm and travel-inspiring;
- useful for families, solo travellers and groups;
- modern without being trend-dependent;
- calm enough for planning complex trips;
- accessible in light, dark and RTL layouts.

## Visual tokens

Shared JavaScript tokens live in `packages/design-tokens/src` so web, Admin and mobile can use the same brand decisions without copying raw values.

The palette uses deep ocean tones for trust, warm sand backgrounds for editorial warmth and a coral action accent. This intentionally avoids the common purple/blue AI-product aesthetic.

Semantic theme keys include:

- `background`;
- `surface` / `surfaceElevated` / `surfaceMuted`;
- `textPrimary` / `textSecondary` / `textMuted`;
- `brandPrimary` / `brandSecondary` / `brandAccent`;
- `borderSubtle` / `borderStrong`;
- `focusRing`;
- success, warning, danger and info.

Components should depend on semantic values rather than palette values whenever practical.

## Typography

The current development baseline is system-first to avoid an external font request during local builds. UI uses a modern system sans stack; large editorial travel headings use a restrained serif stack. A licensed/self-hosted brand font can later replace either stack at the token level without rewriting individual components.

## Icons

Use Lucide consistently:

- `lucide-react` for customer web and Admin;
- `lucide-react-native` for the Expo application.

Do not generate interface icons with AI. Do not mix unrelated icon families casually. Icons that communicate meaning must have a text label or accessible name; decorative icons should be hidden from assistive technology.

## Customer website shell

Phase 5A establishes:

- sticky, blurred navigation with compact language/currency/theme controls;
- responsive mobile navigation;
- cinematic but readable hero imagery;
- destination-first search tabs;
- a separate budget-first entry point (the user can know their budget without knowing the destination);
- recent-search shortcuts only after preference-storage consent;
- editorial destination imagery without fake prices, ratings or trend statistics;
- whole-trip accommodation-value storytelling;
- family-age planning emphasis;
- compact travel-tool links;
- calm, clearly separated safety section;
- functional cookie/privacy controls;
- professional authentication shell.

## Real-data rule in design

The interface must never become visually impressive by inventing live travel data. If a provider is not connected, the corresponding route uses an honest unavailable state. Static editorial destination names/images may be used for inspiration, but live fares, availability, ratings, weather, opening hours and emergency facts must come from their approved data source.

## Responsive strategy

Desktop, tablet and mobile are intentional layouts rather than one desktop canvas scaled down. Destination cards become a touch-friendly horizontal collection on small screens, search becomes stacked, header controls move into the mobile menu, and large split editorial sections become vertical.

## Motion

Motion is subtle and functional: small image scale, hover elevation and short control transitions. `prefers-reduced-motion` disables non-essential motion globally.

## Internationalization and RTL

Customer-facing copy comes from maintained locale messages. Layouts use inline-aware CSS (`margin-inline`, `padding-inline`, `inset-inline`) for directional behavior. Arabic sets `dir="rtl"` at the root document.

Proper nouns such as AttraVoya Pro and destination city names remain proper nouns; country names use localized international display names where supported.

## Quality rule

A component is not accepted merely because it looks good. Important controls require working behavior, keyboard access, visible focus, responsive states, translated copy, error/disabled states where applicable and tests appropriate to the feature.
