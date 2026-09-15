// Package consumer regression test.
//
// Packs both publishable workspaces into a temp folder (dry-run, nothing is
// published), inspects the real tarball contents, then installs both tarballs
// with the editor's React/CodeMirror peer dependencies into an isolated temp
// consumer project and verifies the runtime API, the style.css subpath via
// actual exports resolution, and the public type surface of both packages by
// compiling a TypeScript fixture — without relying on workspace symlinks.
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
// The editor's .d.ts references React's types; a real TypeScript consumer
// needs them installed for the public type surface to compile.
const TYPE_INSTALL_SPECS = ['@types/react@^19'];

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
      JSON.stringify(
        { name: 'galley-consumer-fixture', private: true, version: '0.0.0', type: 'module' },
        null,
        2,
      ),
    );
    run(
      'npm',
      ['install', '--no-audit', '--no-fund', editorTarball, themesTarball, ...PEER_INSTALL_SPECS, ...TYPE_INSTALL_SPECS],
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

      const styleCssUrl = import.meta.resolve('@inkyquill/galley-editor/style.css');
      assert.ok(
        styleCssUrl.endsWith('@inkyquill/galley-editor/dist/style.css'),
        'style.css subpath resolved to an unexpected target: ' + styleCssUrl,
      );
      assert.ok(existsSync(new URL(styleCssUrl)), 'resolved editor style.css missing');
    `;
    run(process.execPath, ['--input-type=module', '-e', checkScript], { cwd: consumerDir });

    // The runtime imports above prove the root entries resolve; compiling a
    // fixture against the installed packages proves the exports map also
    // serves the public types (.d.ts) to a real consumer toolchain.
    writeFileSync(
      join(consumerDir, 'typecheck.ts'),
      [
        "import type { GalleyEditorProps, GalleyHandle } from '@inkyquill/galley-editor';",
        'import type {',
        '  ThemeCssVariables,',
        '  ThemeDefinition,',
        '  ThemeId,',
        '  ThemeScheme,',
        '  ThemeTokens,',
        "} from '@inkyquill/galley-themes';",
        '',
        "const themeId: ThemeId = 'galley-light';",
        "const scheme: ThemeScheme = 'light';",
        "const variables: ThemeCssVariables = { colorScheme: scheme, '--app-bg': '#f6f4ef' };",
        'const definition: ThemeDefinition | undefined = undefined;',
        'const tokens: ThemeTokens | undefined = undefined;',
        'const props: GalleyEditorProps = {};',
        'const handle: GalleyHandle | null = null;',
        '',
        'export { definition, handle, props, scheme, themeId, tokens, variables };',
        '',
      ].join('\n'),
    );
    const tscBin = join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
    assert.ok(existsSync(tscBin), 'typescript is not installed at the repository root');
    run(
      process.execPath,
      [
        tscBin,
        '--noEmit',
        '--strict',
        '--module',
        'nodenext',
        '--moduleResolution',
        'nodenext',
        '--target',
        'es2022',
        '--lib',
        'es2022,dom',
        'typecheck.ts',
      ],
      { cwd: consumerDir },
    );
  } finally {
    rmSync(packDir, { recursive: true, force: true });
    rmSync(consumerDir, { recursive: true, force: true });
  }
});
