// Package consumer regression test.
//
// Packs both publishable workspaces into a temp folder (dry-run, nothing is
// published), inspects the real tarball contents, then installs both tarballs
// with the editor's React/CodeMirror peer dependencies into an isolated temp
// consumer project and verifies the runtime API, the .d.ts entry points, and
// the style.css export — without relying on workspace symlinks.
//
// Run with: node --test tests/package-consumer/exports.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REQUIRED_EDITOR_FILES = [
  'package/package.json',
  'package/README.md',
  'package/LICENSE',
  'package/dist/index.js',
  'package/dist/index.d.ts',
  'package/dist/style.css',
];
const REQUIRED_THEMES_FILES = [
  'package/package.json',
  'package/README.md',
  'package/LICENSE',
  'package/dist/index.js',
  'package/dist/index.d.ts',
];
const FORBIDDEN_ENTRIES = /^package\/(src|3rdparty|node_modules|\.storybook|docs|coverage|tests)\//;
const PEER_INSTALL_SPECS = [
  'react@^19',
  'react-dom@^19',
  '@codemirror/commands@^6',
  '@codemirror/lang-markdown@^6',
  '@codemirror/language@^6',
  '@codemirror/search@^6',
  '@codemirror/state@^6',
  '@codemirror/view@^6',
  '@lezer/highlight@^1',
  '@lezer/markdown@^1',
];

function run(command, args, options) {
  return execFileSync(command, args, { encoding: 'utf8', ...options });
}

function packWorkspace(name, destination) {
  const output = run(
    'npm',
    ['pack', '--json', `--pack-destination=${destination}`, `--workspace=${name}`],
    { cwd: repoRoot },
  );
  const [packed] = JSON.parse(output);
  assert.ok(packed, `npm pack --json returned no entry for ${name}`);
  assert.equal(packed.name, name);
  const tarball = join(destination, packed.filename);
  assert.ok(existsSync(tarball), `expected packed tarball at ${tarball}`);
  return tarball;
}

function tarballListing(tarball) {
  return run('tar', ['-tzf', tarball]).split('\n').filter(Boolean);
}

test('npm tarballs expose the editor and themes contracts without a workspace symlink', () => {
  const packDir = mkdtempSync(join(tmpdir(), 'galley-pack-'));
  const consumerDir = mkdtempSync(join(tmpdir(), 'galley-consumer-'));

  try {
    const editorTarball = packWorkspace('@inkyquill/galley-editor', packDir);
    const themesTarball = packWorkspace('@inkyquill/galley-themes', packDir);

    const editorEntries = tarballListing(editorTarball);
    const themesEntries = tarballListing(themesTarball);

    for (const required of REQUIRED_EDITOR_FILES) {
      assert.ok(
        editorEntries.includes(required),
        `editor tarball is missing ${required}`,
      );
    }
    for (const required of REQUIRED_THEMES_FILES) {
      assert.ok(
        themesEntries.includes(required),
        `themes tarball is missing ${required}`,
      );
    }
    for (const entry of [...editorEntries, ...themesEntries]) {
      assert.doesNotMatch(
        entry,
        FORBIDDEN_ENTRIES,
        `tarball contains forbidden entry: ${entry}`,
      );
    }

    writeFileSync(
      join(consumerDir, 'package.json'),
      JSON.stringify({ name: 'galley-consumer-fixture', private: true, version: '0.0.0' }, null, 2),
    );
    run(
      'npm',
      ['install', '--no-audit', '--no-fund', editorTarball, themesTarball, ...PEER_INSTALL_SPECS],
      { cwd: consumerDir },
    );

    const checkScript = `
      import { existsSync } from 'node:fs';
      import assert from 'node:assert/strict';

      const themes = await import('@inkyquill/galley-themes');
      for (const name of [
        'BUILT_IN_THEMES',
        'DEFAULT_CONSTANT_THEME_ID',
        'DEFAULT_DARK_THEME_ID',
        'DEFAULT_LIGHT_THEME_ID',
        'getTheme',
        'isThemeId',
        'listThemesByScheme',
        'themeToCssVariables',
      ]) {
        assert.ok(themes[name], \`themes export missing: \${name}\`);
      }
      assert.equal(themes.BUILT_IN_THEMES.length, 13);
      assert.equal(themes.DEFAULT_LIGHT_THEME_ID, 'galley-light');
      assert.equal(themes.DEFAULT_DARK_THEME_ID, 'galley-dark');
      assert.equal(themes.DEFAULT_CONSTANT_THEME_ID, 'galley-light');
      const galleyLight = themes.getTheme('galley-light');
      assert.equal(galleyLight.scheme, 'light');
      assert.equal(themes.themeToCssVariables(galleyLight)['--app-bg'], '#f6f4ef');
      assert.equal(themes.themeToCssVariables(galleyLight)['--ge-color-bg'], '#fbfaf7');
      assert.ok(themes.isThemeId('galley-dark'));
      assert.ok(!themes.isThemeId('nope'));

      const editor = await import('@inkyquill/galley-editor');
      for (const name of [
        'GalleyEditor',
        'ErrorBoundary',
        'BUILT_IN_PLUGINS',
        'BUILTIN_COMMANDS',
        'makeInlinePlugin',
        'makeBlockPlugin',
      ]) {
        assert.ok(editor[name], \`editor export missing: \${name}\`);
      }

      assert.ok(
        existsSync('node_modules/@inkyquill/galley-themes/dist/index.d.ts'),
        'themes dist/index.d.ts missing',
      );
      assert.ok(
        existsSync('node_modules/@inkyquill/galley-editor/dist/index.d.ts'),
        'editor dist/index.d.ts missing',
      );
      assert.ok(
        existsSync('node_modules/@inkyquill/galley-editor/dist/style.css'),
        'editor dist/style.css missing',
      );
    `;
    run(process.execPath, ['--input-type=module', '-e', checkScript], { cwd: consumerDir });
  } finally {
    rmSync(packDir, { recursive: true, force: true });
    rmSync(consumerDir, { recursive: true, force: true });
  }
});
