#!/usr/bin/env bash
# Publishes a release from this Mac: builds the arm64 and x64 DMGs, signs and notarizes them,
# checks them and creates the GitHub release for the version in package.json.
#
# Credentials come from the login keychain:
#   - a "Developer ID Application" signing identity (override with APPLE_SIGNING_IDENTITY);
#   - a generic password item named "apple-notary" (override with NOTARY_ITEM) whose account is
#     the Apple ID and whose password is an app-specific password. The first run creates it.
#
# Run it on main with the version bump committed, then push main: the release workflow finds
# the published release and skips its own build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NOTARY_ITEM="${NOTARY_ITEM:-apple-notary}"
VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"

fail() { echo "error: $*" >&2; exit 1; }

[[ "$(git branch --show-current)" == main ]] || fail "run this on main"
[[ -z "$(git status --porcelain)" ]] || fail "commit or stash your changes first"
grep -q "^## ${VERSION//./\\.}\$" CHANGELOG.md || fail "CHANGELOG.md has no '## $VERSION' section"
if gh release view "$TAG" >/dev/null 2>&1; then fail "$TAG is already published"; fi

# Signing identity and team.
if [[ -z "${APPLE_SIGNING_IDENTITY:-}" ]]; then
  APPLE_SIGNING_IDENTITY="$(security find-identity -v -p codesigning |
    sed -n 's/.*"\(Developer ID Application: .*\)"$/\1/p' | head -1)"
fi
[[ -n "$APPLE_SIGNING_IDENTITY" ]] || fail "no Developer ID Application identity in the keychain"
APPLE_TEAM_ID="${APPLE_SIGNING_IDENTITY##*(}"
APPLE_TEAM_ID="${APPLE_TEAM_ID%)}"

# Notarization credentials, asked once and kept in the keychain.
if ! security find-generic-password -s "$NOTARY_ITEM" >/dev/null 2>&1; then
  echo "The keychain has no '$NOTARY_ITEM' item yet. It stores the Apple ID used for notarization"
  echo "and an app-specific password (create one at https://account.apple.com, Sign-In and Security)."
  read -rp "Apple ID: " apple_id
  [[ -n "$apple_id" ]] || fail "an Apple ID is required"
  echo "Paste the app-specific password (asked twice, nothing is shown):"
  security add-generic-password -s "$NOTARY_ITEM" -a "$apple_id" -l "$NOTARY_ITEM" \
    -D "app-specific password" -w
fi
APPLE_ID="$(security find-generic-password -s "$NOTARY_ITEM" | sed -n 's/.*"acct"<blob>="\(.*\)"$/\1/p')"
APPLE_PASSWORD="$(security find-generic-password -s "$NOTARY_ITEM" -w)"
export APPLE_SIGNING_IDENTITY APPLE_TEAM_ID APPLE_ID APPLE_PASSWORD

echo "Releasing $TAG, signed by $APPLE_SIGNING_IDENTITY, notarized as $APPLE_ID"
pnpm run build:mac:all

dmgs=(
  src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*_"${VERSION}"_*.dmg
  src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/*_"${VERSION}"_*.dmg
)
for dmg in "${dmgs[@]}"; do
  [[ -f "$dmg" ]] || fail "missing $dmg"
  codesign --verify --strict "$dmg"
  mnt="$(mktemp -d)"
  hdiutil attach -nobrowse -readonly -mountpoint "$mnt" "$dmg" >/dev/null
  app=("$mnt"/*.app)
  codesign --verify --deep --strict "${app[0]}"
  spctl --assess --type execute "${app[0]}"
  xcrun stapler validate -q "${app[0]}"
  hdiutil detach -quiet "$mnt"
  echo "OK  $dmg"
done

notes="$(awk "/^## ${VERSION//./\\.}\$/{flag=1; next} /^## /{flag=0} flag" CHANGELOG.md)"
echo
echo "$notes"
echo
read -rp "Publish $TAG with these notes and DMGs? [y/N] " answer
[[ "$answer" == [yY] ]] || fail "not published"

git tag "$TAG"
git push origin "$TAG"
gh release create "$TAG" --verify-tag --title "$TAG" --notes "$notes" "${dmgs[@]}"
echo "Published $TAG. Push main now: the release workflow sees $TAG and skips its build."
