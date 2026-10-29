#!/usr/bin/env bash
# Publish `video_downloader_app/` as a standalone GitHub repository.
# Usage:
#   ./scripts/publish_new_repo.sh <github-repo-name-or-url> [--private]

set -euo pipefail

REPO_ARG="${1:-vdownloader-os}"
VISIBILITY="${2:---public}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

TMP_EXPORT="$(mktemp -d)"
trap 'rm -rf "${TMP_EXPORT}"' EXIT

cp -R "${PROJECT_DIR}/." "${TMP_EXPORT}/"
rm -rf "${TMP_EXPORT}/.git" "${TMP_EXPORT}/__pycache__" "${TMP_EXPORT}/.pytest_cache"

cd "${TMP_EXPORT}"
git init -b main
git add .
git commit -m "Initial release: VDownloader OS desktop downloader, transcript suite & analytical dashboards"

if [[ "${REPO_ARG}" == http* ]] || [[ "${REPO_ARG}" == git@* ]]; then
  git remote add origin "${REPO_ARG}"
  git push -u origin main
  echo "Successfully pushed standalone repository to ${REPO_ARG}"
else
  gh repo create "${REPO_ARG}" "${VISIBILITY}" --source=. --remote=origin --push
  echo "Successfully created and pushed standalone GitHub repository: ${REPO_ARG}"
fi
