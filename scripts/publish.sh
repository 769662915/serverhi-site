#!/usr/bin/env bash
# Pre-flight checks + commit + push for one new article directory.
# Usage: publish.sh <repo_path> <article_relpath> <required_fields_csv> [branch]
# All checks run BEFORE git add: a failed check leaves the repo without new commits.
set -u

fail() { echo "ERROR: $1" >&2; exit 1; }

[ $# -ge 3 ] || fail "usage: publish.sh <repo_path> <article_relpath> <required_fields_csv> [branch]"
REPO="$1"; REL="$2"; FIELDS_CSV="$3"; BRANCH="${4:-main}"
DIR="$REPO/$REL"

git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "not a git repo: $REPO"
[ -d "$DIR" ] || fail "article dir not found: $DIR"

MD_COUNT=$(find "$DIR" -maxdepth 1 -name '*.md' | wc -l)
[ "$MD_COUNT" -ge 1 ] || fail "no markdown files in $DIR"

IFS=',' read -r -a FIELDS <<< "$FIELDS_CSV"
for md in "$DIR"/*.md; do
  fm=$(awk '/^---[[:space:]]*$/{c++; next} c==1{print} c>=2{exit}' "$md")
  [ -n "$fm" ] || fail "no frontmatter in $md"
  for field in "${FIELDS[@]}"; do
    val=$(printf '%s\n' "$fm" | grep -E "^${field}:" | head -1 \
      | sed -E "s/^${field}:[[:space:]]*//" | sed -E 's/^["'\'']+|["'\'']+$//g' \
      | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')
    [ -n "$val" ] || fail "missing or empty frontmatter field '${field}' in $md"
  done
done

COVER=$(find "$DIR" -maxdepth 1 \( -name '*.webp' -o -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \) -size +0c | head -1)
[ -n "$COVER" ] || fail "no non-empty cover image in $DIR"

SLUG=$(basename "$REL")
STAGED=$(git -C "$REPO" diff --cached --name-only)
[ -z "$STAGED" ] || fail "repo has pre-staged changes: $STAGED"
git -C "$REPO" add "$REL" || fail "git add failed"
git -C "$REPO" commit -m "feat(auto): publish article ${SLUG}" || fail "git commit failed"

for attempt in 1 2 3; do
  if git -C "$REPO" push origin "$BRANCH"; then
    echo "OK: published ${SLUG} to ${BRANCH}"
    exit 0
  fi
  echo "push attempt ${attempt} failed" >&2
  sleep 5
done

git -C "$REPO" reset --hard HEAD~1 \
  || fail "push failed AND rollback failed - HEAD stranded at $(git -C "$REPO" rev-parse HEAD); manual cleanup required"
fail "push failed after 3 attempts; commit rolled back"
