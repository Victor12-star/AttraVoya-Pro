# braces temporary security vendor

This directory contains the published braces 3.0.3 runtime with only the security changes from the current upstream CVE-2026-93687 fix candidate applied.

Published base: braces 3.0.3
Upstream project: https://github.com/micromatch/braces
Upstream pull request: https://github.com/micromatch/braces/pull/72
Fix candidate commit: 28d440b5dd449dbf1fe6f3506cf94ecca4d02660
Advisory: GHSA-vfj7-8cjw-p6xm / CVE-2026-93687

Only the runtime files required by package consumers are vendored here, together with the original MIT license and an AttraVoya regression test. Unrelated changes present on the contributor fork are intentionally excluded; only the changes shown in upstream PR #72 are applied to the official 3.0.3 runtime.

The workspace package uses version 3.0.4-0 only to distinguish this temporary patched build from vulnerable 3.0.3. It is not represented as an official npm release.

This is temporary. Replace this workspace override with the official maintained braces release as soon as a patched upstream version is published and passes AttraVoya's dependency gates.
