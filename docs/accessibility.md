# Accessibility baseline

AttraVoya Pro targets WCAG 2.2 AA for the customer website and Admin interface and applies equivalent platform accessibility practices on mobile.

Phase 5A baseline:

- semantic links and buttons instead of clickable generic containers;
- explicit `type` on buttons;
- visible `:focus-visible` treatment;
- labelled form controls;
- validation messages associated with the affected search field;
- minimum touch-friendly control sizing;
- page `lang` and `dir` set from the active locale;
- RTL-aware logical spacing for directional layouts;
- `prefers-reduced-motion` support;
- decorative background imagery kept out of the accessibility tree;
- text remains independent from images rather than being baked into artwork;
- language/currency controls remain reachable on the mobile layout.

Automated accessibility checks do not replace keyboard and screen-reader testing. Playwright + axe, keyboard navigation, 200% zoom, VoiceOver/TalkBack and RTL visual checks remain part of the later quality gate.
