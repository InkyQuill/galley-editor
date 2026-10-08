import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractReleaseNotes } from './release-notes.mjs';

for (const heading of ['#', '##']) {
  test(`extracts complete release notes from ${heading} headings without older releases`, () => {
    const body = '### Breaking changes\n\n* Remove old API.\n\n### Fixes\n\n* Preserve cells.\n* Preserve undo.';
    const changelog = `# Changelog\n\n${heading} [0.17.0](https://example.com/compare) (2026-10-08)\n\n${body}\n\n## [0.16.0]\n\nOlder notes.\n`;
    assert.equal(extractReleaseNotes(changelog, '0.17.0'), body);
    assert.equal(extractReleaseNotes(changelog, '0.16.0'), 'Older notes.');
    assert.equal(extractReleaseNotes(changelog, '0.18.0'), null);
  });
}

test('version dots match literally', () => {
  assert.equal(extractReleaseNotes('## [0x17x0]\n\nOther release.', '0.17.0'), null);
});
