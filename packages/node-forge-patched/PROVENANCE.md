# node-forge temporary security vendor

This directory contains the runtime JavaScript files from the node-forge CVE-2026-85393 fix candidate.

Source repository: https://github.com/Krysthyan/forge
Source commit: ceba34402e329f0365134f23fe19898756527d65
Upstream pull request: https://github.com/digitalbazaar/forge/pull/1152
Upstream project: https://github.com/digitalbazaar/forge
Advisory: GHSA-86w9-cpqp-85rv / CVE-2026-85393

The source commit identifies itself as node-forge 1.4.1-0 and adds strict nested DigestAlgorithm element-count validation plus an upstream regression test.

Only published runtime files from lib/*.js are vendored here, together with the original LICENSE. Development dependencies, examples, generated browser bundles, test fixtures, and unrelated upstream repository files are intentionally omitted.

This is temporary. Replace this workspace override with the official maintained node-forge release as soon as an upstream patched release is published and passes AttraVoya's dependency gates.
