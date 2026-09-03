#!/usr/bin/env bash
set -euo pipefail

# Thin shell wrapper for developers using Git Bash/macOS/Linux. The actual
# setup logic lives in JavaScript so Windows and Unix developers share one path.
node scripts/setup-development.js
node scripts/validate-env.js
