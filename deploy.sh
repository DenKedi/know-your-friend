#!/usr/bin/env bash
# Deploy: push to GitHub (origin) for Cloudflare Pages frontend
# and to Heroku (heroku) for the backend dyno.
#
# Usage:
#   ./deploy.sh                # uses default commit message
#   ./deploy.sh "my message"   # uses provided commit message
#
# Requires: git, heroku CLI authenticated, remotes "origin" and "heroku" set.

set -euo pipefail

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
MSG="${1:-Deploy: $(date +%Y-%m-%d\ %H:%M:%S)}"

echo "==> Branch: $BRANCH"

# Stage and commit only if there are changes.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "==> Committing local changes"
  git add -A
  git commit -m "$MSG"
else
  echo "==> No local changes to commit"
fi

# Verify remotes exist.
git remote get-url origin >/dev/null 2>&1 || {
  echo "ERROR: git remote 'origin' is not configured." >&2
  exit 1
}
git remote get-url heroku >/dev/null 2>&1 || {
  echo "ERROR: git remote 'heroku' is not configured. Run: heroku git:remote -a know-your-friend" >&2
  exit 1
}

echo "==> Pushing to GitHub (origin/$BRANCH) — triggers Cloudflare Pages"
git push origin "$BRANCH"

echo "==> Pushing to Heroku (heroku/main) — triggers backend deploy"
# Heroku expects pushes to its 'main' branch.
if [[ "$BRANCH" == "main" ]]; then
  git push heroku main
else
  git push heroku "$BRANCH:main"
fi

echo "==> Done."
