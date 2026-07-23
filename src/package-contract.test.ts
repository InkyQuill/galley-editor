import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = resolve(root, 'package.json');
const installationGuidePath = resolve(
  root,
  'docs-site/src/content/docs/guides/installation.md',
);

describe('package documentation contract', () => {
  it('documents every declared peer dependency with its manifest range', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      peerDependencies: Record<string, string>;
    };
    const installationGuide = readFileSync(installationGuidePath, 'utf8');
    const documentedPeers = Object.fromEntries(
      Array.from(
        installationGuide.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|$/gm),
        (match) => [match[1], match[2]],
      ),
    );

    expect(documentedPeers).toEqual(packageJson.peerDependencies);
  });
});
