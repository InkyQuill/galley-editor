#!/usr/bin/env bash
# Manual pre-tag verification.
#
# Builds both publishable packages, packs them, inspects the tarballs, then
# installs them into a temp project to sanity-check that types, the CSS
# export, and the theme API resolve. Nothing is published.
#
# Usage: scripts/verify-publish.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

EDITOR_DIR="packages/galley-editor"
THEMES_DIR="packages/galley-themes"
PACK_DIR="$(mktemp -d)"
CONSUMER_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$PACK_DIR" "$CONSUMER_DIR"
}
trap cleanup EXIT

echo "==> Cleaning"
rm -rf "$EDITOR_DIR/dist" "$THEMES_DIR/dist"

echo "==> Building editor library"
npm run build:lib

echo "==> Building themes package"
npm run build:themes

echo "==> Inspecting dist/"
test -f "$EDITOR_DIR/dist/index.js"   || { echo "FAIL: editor dist/index.js missing";   exit 1; }
test -f "$EDITOR_DIR/dist/index.d.ts" || { echo "FAIL: editor dist/index.d.ts missing"; exit 1; }
test -f "$EDITOR_DIR/dist/style.css"  || { echo "FAIL: editor dist/style.css missing";  exit 1; }
test -f "$THEMES_DIR/dist/index.js"   || { echo "FAIL: themes dist/index.js missing";   exit 1; }
test -f "$THEMES_DIR/dist/index.d.ts" || { echo "FAIL: themes dist/index.d.ts missing"; exit 1; }
echo "OK: editor index.js/index.d.ts/style.css and themes index.js/index.d.ts present"

echo "==> Forbidden-content check (3rdparty / joplin)"
if grep -rIE '(3rdparty|joplin|@joplin)' "$EDITOR_DIR/dist/" "$THEMES_DIR/dist/" 2>/dev/null ; then
  echo "FAIL: forbidden tokens found in dist/"
  exit 1
fi
echo "OK: dist/ is clean"

echo "==> Packing (dry-run only — nothing is published)"
EDITOR_TARBALL="$PACK_DIR/$(npm pack --workspace @inkyquill/galley-editor --pack-destination "$PACK_DIR" 2>/dev/null | tail -1)"
THEMES_TARBALL="$PACK_DIR/$(npm pack --workspace @inkyquill/galley-themes --pack-destination "$PACK_DIR" 2>/dev/null | tail -1)"
echo "Editor tarball: $EDITOR_TARBALL"
echo "Themes tarball: $THEMES_TARBALL"

check_tarball() {
  local tarball="$1"
  shift
  local listing
  listing="$(tar -tzf "$tarball")"
  local expected
  for expected in "$@"; do
    if ! printf '%s\n' "$listing" | grep -Fxq -- "$expected"; then
      echo "FAIL: tarball missing $expected"
      exit 1
    fi
  done
  if printf '%s\n' "$listing" | grep -E '^package/(src|3rdparty|node_modules|\.storybook|docs|coverage|tests?)/'; then
    echo "FAIL: tarball contains forbidden directories"
    exit 1
  fi
}

echo "==> Verifying editor tarball contents"
check_tarball "$EDITOR_TARBALL" \
  package/LICENSE package/README.md package/package.json \
  package/dist/index.js package/dist/index.d.ts package/dist/style.css
if [ -f "$EDITOR_DIR/CHANGELOG.md" ]; then
  check_tarball "$EDITOR_TARBALL" package/CHANGELOG.md
fi
echo "OK: editor tarball complete"

echo "==> Verifying themes tarball contents"
check_tarball "$THEMES_TARBALL" \
  package/LICENSE package/README.md package/package.json \
  package/dist/index.js package/dist/index.d.ts
if [ -f "$THEMES_DIR/CHANGELOG.md" ]; then
  check_tarball "$THEMES_TARBALL" package/CHANGELOG.md
fi
echo "OK: themes tarball complete"

echo "==> Installing tarballs into an isolated temp consumer"
cd "$CONSUMER_DIR"
printf '%s\n' '{ "name": "galley-verify-consumer", "private": true, "version": "0.0.0" }' > package.json
npm install --no-audit --no-fund \
  "$EDITOR_TARBALL" "$THEMES_TARBALL" \
  react@^19 react-dom@^19 \
  @codemirror/commands@^6 @codemirror/lang-markdown@^6 @codemirror/language@^6 \
  @codemirror/search@^6 @codemirror/state@^6 @codemirror/view@^6 \
  @lezer/highlight@^1 @lezer/markdown@^1 > /dev/null

node --input-type=module -e '
  import { existsSync } from "node:fs";
  import assert from "node:assert/strict";

  const themes = await import("@inkyquill/galley-themes");
  for (const name of ["BUILT_IN_THEMES", "DEFAULT_LIGHT_THEME_ID", "DEFAULT_DARK_THEME_ID", "DEFAULT_CONSTANT_THEME_ID", "getTheme", "isThemeId", "listThemesByScheme", "themeToCssVariables"]) {
    assert.ok(themes[name], `themes export missing: ${name}`);
  }
  const galleyLight = themes.getTheme("galley-light");
  assert.equal(galleyLight.scheme, "light");
  assert.equal(themes.themeToCssVariables(galleyLight)["--app-bg"], "#f6f4ef");

  const editor = await import("@inkyquill/galley-editor");
  for (const name of ["GalleyEditor", "ErrorBoundary", "BUILT_IN_PLUGINS", "BUILTIN_COMMANDS", "makeInlinePlugin", "makeBlockPlugin"]) {
    assert.ok(editor[name], `editor export missing: ${name}`);
  }

  assert.ok(existsSync("node_modules/@inkyquill/galley-themes/dist/index.d.ts"), "themes dist/index.d.ts missing");
  assert.ok(existsSync("node_modules/@inkyquill/galley-editor/dist/index.d.ts"), "editor dist/index.d.ts missing");
  assert.ok(existsSync("node_modules/@inkyquill/galley-editor/dist/style.css"), "editor dist/style.css missing");
'
cd "$REPO_ROOT"

echo
echo "==> SUCCESS — tarballs are ready to publish"
echo "    npm publish --workspace @inkyquill/galley-editor"
echo "    npm publish --workspace @inkyquill/galley-themes"
echo
