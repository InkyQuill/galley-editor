import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const script = fileURLToPath(new URL('./validate-commit-msg.mjs', import.meta.url));

function withMessage(message, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'galley-commit-msg-'));
  const path = join(dir, 'COMMIT_EDITMSG');
  writeFileSync(path, message);
  try {
    return fn(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function validate(message) {
  return withMessage(message, (path) =>
    spawnSync(process.execPath, [script, path], { encoding: 'utf8' }),
  );
}

test('accepts conventional commit subjects', () => {
  for (const message of [
    'fix: handle empty table control icons',
    'docs(api): document table control icons',
    'feat!: remove deprecated editor prop',
    'refactor(editor-core): simplify controller setup',
    '# comment from git\n\nci: run release workflow',
  ]) {
    const result = validate(message);
    assert.equal(result.status, 0, result.stderr);
  }
});

test('accepts merge commits', () => {
  const result = validate('Merge pull request #42 from branch');

  assert.equal(result.status, 0, result.stderr);
});

test('rejects non-conventional commit subjects', () => {
  const result = validate('update table docs');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid commit message/);
});

test('prints usage when no commit message file is provided', () => {
  assert.throws(
    () => execFileSync(process.execPath, [script], { encoding: 'utf8', stdio: 'pipe' }),
    /Usage: validate-commit-msg/,
  );
});
