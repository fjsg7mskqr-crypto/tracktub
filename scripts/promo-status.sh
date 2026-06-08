#!/usr/bin/env bash
#
# promo-status.sh — show what's promoted where across the main → test → prod
# deploy tiers, and the exact command to promote the next gap. Read-only.
#
#   main → preview · test → staging · prod → LIVE (Vercel Production Branch)
#
# Usage:
#   scripts/promo-status.sh             # fetches origin first (default)
#   scripts/promo-status.sh --no-fetch  # skip the fetch, use local refs
#
# Run it from anywhere in the repo, or via:  cd apps/web && npm run promo:status
#
set -uo pipefail

REMOTE="origin"
PROD_URL="https://tracktub.vercel.app"

if [ "${1:-}" != "--no-fetch" ]; then
  git fetch "$REMOTE" --quiet --prune 2>/dev/null \
    || echo "(warning: git fetch failed — showing last-known refs)"
fi

tip()  { git rev-parse --short "$REMOTE/$1" 2>/dev/null || echo "???????"; }
subj() { git log -1 --format='%s' "$REMOTE/$1" 2>/dev/null | cut -c1-46; }

echo
echo "TrackTub deploy tiers  ($REMOTE)"
echo "──────────────────────────────────────────────────────────────────"
printf "  main  %-8s  %-46s  → preview\n" "$(tip main)" "$(subj main)"
printf "  test  %-8s  %-46s  → staging\n" "$(tip test)" "$(subj test)"
printf "  prod  %-8s  %-46s  → LIVE\n"    "$(tip prod)" "$(subj prod)"
echo

# Show one promotion gap: commits on $head that aren't on $base yet.
gap() {
  base="$1"; head="$2"
  commits="$(git log --oneline "$REMOTE/$base..$REMOTE/$head" 2>/dev/null)"
  if [ -z "$commits" ]; then
    printf "  ✓  %s → %s : caught up — nothing to promote\n" "$head" "$base"
  else
    n="$(printf '%s\n' "$commits" | wc -l | tr -d ' ')"
    printf "  ▲  %s → %s : %s commit(s) ready to promote\n" "$head" "$base" "$n"
    printf '%s\n' "$commits" | sed 's/^/        /'
    printf "     ↳ promote:  gh pr create --base %s --head %s --title \"Promote to %s\"\n" \
      "$base" "$head" "$base"
  fi
}

echo "Promotion gaps"
echo "──────────────────────────────────────────────────────────────────"
gap test main   # main → test
echo
gap prod test   # test → prod
echo

# Best-effort live production health check.
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "$PROD_URL/login" 2>/dev/null || echo 'n/a')"
echo "──────────────────────────────────────────────────────────────────"
printf "  live  %s/login → HTTP %s\n" "$PROD_URL" "$code"
echo
