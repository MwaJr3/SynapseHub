#!/usr/bin/env bash
#
# Cut the two prepared collections out into their own branches.
#
# Does not push unless asked, refuses a dirty tree, refuses to reuse a branch —
# the failure mode of a split script is losing work, so it stops rather than
# guesses.
#
#   ./scripts/split-branches.sh          # create the branches locally
#   ./scripts/split-branches.sh --push   # ...then push them to origin
#
# Read docs/branch-splits.md first: cutting the branch is the easy half. `main`
# still claims this code lives here, in company-platform/src/content/evidence.ts
# and projects.json, and removing the code without rewriting those claims leaves
# two failing tests — deliberately.
#
# Implementation note: `git subtree split` is the obvious tool and is used when
# present, but it ships as a contrib script and is absent from some images (this
# one included). The fallback rebuilds the branch with plumbing only — replaying
# each commit's subtree through `git commit-tree`, which produces the same linear
# history `subtree split` does, with no contrib dependency.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PUSH=0
[[ "${1:-}" == "--push" ]] && PUSH=1

#   branch:prefix
SPLITS=(
  "split/challenges:challenges"
  "split/cbu-assignments:coursework/cbu-assignments"
)

fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }
note() { printf '\033[36m%s\033[0m\n' "$*"; }

# --- preconditions ------------------------------------------------------------
[[ -n "$(git status --porcelain)" ]] \
  && fail "Working tree is dirty. Commit or stash first — a split from a dirty tree captures a state that is not in any commit."

git show-ref --verify --quiet refs/heads/main \
  || fail "No local 'main'. The splits are cut from committed history, so it has to exist."

SOURCE_REF="${SOURCE_REF:-main}"

for entry in "${SPLITS[@]}"; do
  branch="${entry%%:*}"
  prefix="${entry##*:}"
  [[ -d "$prefix" ]] || fail "Missing directory: $prefix"
  git show-ref --verify --quiet "refs/heads/$branch" \
    && fail "Branch '$branch' already exists. Delete it first if you mean to re-cut it."
done

note "Preconditions met. Source: $SOURCE_REF · current branch: $(git branch --show-current)"

# --- the two implementations --------------------------------------------------

split_with_subtree() {
  local prefix="$1" branch="$2"
  git subtree split --prefix="$prefix" -b "$branch" >/dev/null
}

# Replay the history of one directory onto a fresh linear branch.
split_with_plumbing() {
  local prefix="$1" branch="$2"
  local commit tree message new parent='' parent_tree='' count=0

  # Oldest first, so each commit can point at the one built before it.
  while IFS= read -r commit; do
    # The directory may not exist yet in older commits, or not have changed.
    tree="$(git rev-parse --verify --quiet "${commit}:${prefix}")" || continue
    [[ -z "$tree" ]] && continue
    [[ "$tree" == "$parent_tree" ]] && continue

    message="$(git log -1 --format=%B "$commit")"
    local env_args=(
      "GIT_AUTHOR_NAME=$(git log -1 --format=%an "$commit")"
      "GIT_AUTHOR_EMAIL=$(git log -1 --format=%ae "$commit")"
      "GIT_AUTHOR_DATE=$(git log -1 --format=%aI "$commit")"
      "GIT_COMMITTER_NAME=$(git log -1 --format=%cn "$commit")"
      "GIT_COMMITTER_EMAIL=$(git log -1 --format=%ce "$commit")"
      "GIT_COMMITTER_DATE=$(git log -1 --format=%cI "$commit")"
    )

    if [[ -z "$parent" ]]; then
      new="$(printf '%s' "$message" | env "${env_args[@]}" git commit-tree "$tree")"
    else
      new="$(printf '%s' "$message" | env "${env_args[@]}" git commit-tree "$tree" -p "$parent")"
    fi

    parent="$new"
    parent_tree="$tree"
    count=$((count + 1))
  done < <(git rev-list --reverse --topo-order "$SOURCE_REF")

  [[ -z "$parent" ]] && fail "No commits touch $prefix — nothing to split."
  git branch "$branch" "$parent"
  printf '  replayed %s commits\n' "$count"
}

# --- cut ----------------------------------------------------------------------
if git subtree --help >/dev/null 2>&1; then
  note "Using git subtree split."
  USE_SUBTREE=1
else
  note "git subtree is unavailable; using the plumbing fallback."
  USE_SUBTREE=0
fi

for entry in "${SPLITS[@]}"; do
  branch="${entry%%:*}"
  prefix="${entry##*:}"

  note "Splitting $prefix -> $branch"
  if [[ "$USE_SUBTREE" -eq 1 ]]; then
    split_with_subtree "$prefix" "$branch"
  else
    split_with_plumbing "$prefix" "$branch"
  fi

  commits=$(git rev-list --count "$branch")
  files=$(git ls-tree -r --name-only "$branch" | wc -l | tr -d ' ')
  printf '  %s: %s commits, %s files, head %s\n' \
    "$branch" "$commits" "$files" "$(git rev-parse --short "$branch")"
done

# --- what is left behind ------------------------------------------------------
cat <<'TEXT'

Branches created. Before this is complete:

  1. Rewrite the claims that this code lives on main:
       company-platform/src/content/evidence.ts   (inRepoPath)
       projects.json                              (npm run registry)
  2. Delete the @challenges alias in vite.config.ts and tsconfig.json, and the
     pages that route to it, if the collection is leaving rather than being
     vendored back.
  3. Run: npm test   and   (cd company-platform && npm test)
     Two tests are designed to fail until step 1 is done.

TEXT

if [[ "$PUSH" -eq 1 ]]; then
  for entry in "${SPLITS[@]}"; do
    branch="${entry%%:*}"
    note "Pushing $branch"
    git push origin "$branch"
  done
else
  note "Not pushing. Re-run with --push to publish both branches."
fi
