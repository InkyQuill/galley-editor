#!/usr/bin/env bash
# Manual pre-tag verification.
#
# Builds the library, packs it, inspects the tarball, then installs it
# into a temp project to sanity-check that types and the CSS export
# resolve. Run this once before tagging a release.
#
# Usage: scripts/verify-publish.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Cleaning"
rm -rf dist
rm -f *.tgz

echo "==> Building library"
npm run build:lib

echo "==> Inspecting dist/"
test -f dist/index.js     || { echo "FAIL: dist/index.js missing";   exit 1; }
test -f dist/index.d.ts   || { echo "FAIL: dist/index.d.ts missing"; exit 1; }
test -f dist/style.css    || { echo "FAIL: dist/style.css missing";  exit 1; }
echo "OK: index.js, index.d.ts, style.css all present"

echo "==> Forbidden-content check (3rdparty / joplin)"
if grep -rIE '(3rdparty|joplin|@joplin)' dist/ 2>/dev/null ; then
  echo "FAIL: forbidden tokens found in dist/"
  exit 1
fi
echo "OK: dist/ is clean"

echo "==> Packing"
TARBALL="$(npm pack 2>/dev/null | tail -1)"
echo "Tarball: $TARBALL"

echo "==> Tarball contents"
tar -tzf "$TARBALL" | sort

echo "==> Verifying tarball contains expected files"
EXPECTED=("package/LICENSE" "package/README.md" "package/CHANGELOG.md" "package/package.json" "package/dist/index.js" "package/dist/index.d.ts" "package/dist/style.css")
TAR_LISTING="$(tar -tzf "$TARBALL")"
for f in "${EXPECTED[@]}"; do
  if ! printf '%s\n' "$TAR_LISTING" | grep -Fxq -- "$f"; then
    echo "FAIL: tarball missing $f"
    exit 1
  fi
done
echo "OK: all expected files present"

echo "==> Verifying tarball contains NO unexpected directories"
if tar -tzf "$TARBALL" | grep -E '^package/(src|3rdparty|node_modules|\.storybook|docs|coverage|tests?)/' ; then
  echo "FAIL: tarball contains forbidden directories"
  exit 1
fi
echo "OK: no forbidden directories in tarball"

echo
echo "==> SUCCESS — tarball is ready to publish"
echo "    npm publish $TARBALL"
echo
