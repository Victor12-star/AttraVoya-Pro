# braces temporary security vendor

This directory contains the runtime JavaScript files from the braces CVE-2026-93687 fix candidate.

Source repository: https://github.com/FSDevelop/braces
Source commit: 28d440b5dd449dbf1fe6f3506cf94ecca4d02660
Upstream pull request: https://github.com/micromatch/braces/pull/72
Upstream project: https://github.com/micromatch/braces
Advisory: GHSA-vfj7-8cjw-p6xm / CVE-2026-93687

The source commit adds bounded nesting depth to parsing and recursive AST processing, plus cycle protection for expansion. The upstream pull request reports 904 passing tests on Node 8.3.0 and Node 26.1.0 after follow-up compatibility fixes.

Only runtime files (index.js and lib/*.js) from the exact source commit are vendored here, together with the original MIT LICENSE. The local package version is 3.0.4-attravoya.0 solely to distinguish this maintained security derivative from vulnerable upstream 3.0.3; it is not an upstream release.

This is temporary. Replace this workspace override with an official maintained braces release as soon as upstream publishes a patched version and it passes AttraVoya's dependency gates.
