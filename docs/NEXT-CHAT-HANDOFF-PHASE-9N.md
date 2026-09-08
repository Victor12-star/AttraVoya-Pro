# Phase 9N recovery checkpoint

Continue only from `feature/phase-9n-accommodation-budget-range` unless the slice has already been merged.

Before any further feature change, verify the branch head and CI. Required final gate: all five canonical CI jobs on the exact final PR head, then squash merge, then all five jobs on the exact resulting `develop` commit.

Phase 9N adds accommodation price/comfort presets, room/stay type, max nightly spend, max total accommodation spend, and wires the real budget planner to `/plan-by-budget`. Geoapify remains location-only; do not claim live room prices, availability, or official star ratings from it.
