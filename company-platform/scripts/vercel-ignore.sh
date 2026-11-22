#!/usr/bin/env bash
# Vercel "Ignored Build Step": exit 0 = skip the build, exit 1 = build.
# Builds only when something the site actually renders has changed.
set -u
case "${VERCEL_GIT_COMMIT_REF:-}" in dependabot/*) echo "skip: dependabot branch"; exit 0;; esac
[ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ] && PREV=HEAD^ || PREV=$VERCEL_GIT_PREVIOUS_SHA
git cat-file -e "$PREV" 2>/dev/null || { echo "build: no base commit"; exit 1; }
if git diff --quiet "$PREV" HEAD -- . ../companies ../projects.json ../scripts/build-catalogue.mjs; then
  echo "skip: no website-related changes"; exit 0
fi
echo "build: website-related changes"; exit 1
