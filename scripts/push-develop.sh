#!/usr/bin/env bash
set -euo pipefail

EXPECTED_REMOTE_SHA="50fd7c32a51b2c62cf77f2ea9cb9f3d826ae95d8"
REMOTE_SHA="$(git ls-remote origin refs/heads/develop | awk '{print $1}')"

if [[ -z "$REMOTE_SHA" ]]; then
  echo "Could not read origin/develop. Check your GitHub connection and try again."
  exit 1
fi

if [[ "$REMOTE_SHA" != "$EXPECTED_REMOTE_SHA" ]]; then
  echo "Safety stop: origin/develop changed since this checkpoint was prepared."
  echo "Expected: $EXPECTED_REMOTE_SHA"
  echo "Found:    $REMOTE_SHA"
  echo "Do not force-push. Ask for the branch to be reconciled first."
  exit 1
fi

echo "Remote branch is still at the expected initial commit."
echo "Pushing the tested AttraVoya Pro checkpoint to develop..."

git push -u origin develop --force-with-lease="refs/heads/develop:$EXPECTED_REMOTE_SHA"
