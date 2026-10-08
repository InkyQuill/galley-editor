import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkVersion, isMissingVersion, packageDirs } from './release.mjs';

test('release identity rejects invalid and mismatched versions', () => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), 'galley-release-'));
  try {
    process.chdir(root);
    const write = (path, value) => writeFileSync(path, JSON.stringify(value));
    writeFileSync('version.txt', '0.17.0\n');
    write('.release-please-manifest.json', { '.': '0.17.0' });
    for (const dir of ['.', ...packageDirs]) {
      mkdirSync(dir, { recursive: true });
      write(`${dir}/package.json`, { version: '0.17.0', private: dir === '.' });
    }
    write('package-lock.json', { packages: Object.fromEntries(['', ...packageDirs].map(dir => [dir, { version: '0.17.0' }])) });
    assert.equal(checkVersion('0.17.0'), '0.17.0');
    for (const version of ['v0.17.0', '0.17.0-rc.1', '01.17.0', '../unsafe', undefined]) {
      assert.throws(() => checkVersion(version), /semver/);
    }
    write('packages/galley-themes/package.json', { version: '0.16.0' });
    assert.throws(() => checkVersion('0.17.0'), /synchronized/);
  } finally {
    process.chdir(cwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test('only an explicit registry 404 permits publishing a missing version', () => {
  assert.equal(isMissingVersion({ stdout: '{"error":{"code":"E404"}}' }), true);
  for (const stdout of ['{"error":{"code":"E401"}}', '{"error":{"code":"E503"}}', 'timeout', '', '{}']) {
    assert.equal(isMissingVersion({ stdout }), false);
  }
});
