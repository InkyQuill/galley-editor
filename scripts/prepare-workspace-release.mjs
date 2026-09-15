// Prepare the workspace for a single-version release.
//
// Usage: node scripts/prepare-workspace-release.mjs <VERSION>
//
// Validates the VERSION argument as semver, sets the same version on both
// publishable packages, mirrors the root CHANGELOG.md into each package (so
// it ships in the npm tarballs), refreshes package-lock.json, and builds both
// packages. The root package.json stays private and is never published.

import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const PACKAGE_DIRS = ['packages/galley-editor', 'packages/galley-themes'];

const version = process.argv[2];

if (!version || !SEMVER_PATTERN.test(version)) {
  console.error('Usage: node scripts/prepare-workspace-release.mjs <VERSION>');
  console.error('       VERSION must be a valid semver release, e.g. 0.14.0.');
  process.exit(1);
}

for (const dir of PACKAGE_DIRS) {
  const manifestPath = `${dir}/package.json`;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Set ${manifest.name} to ${version}`);
}

if (existsSync('CHANGELOG.md')) {
  for (const dir of PACKAGE_DIRS) {
    copyFileSync('CHANGELOG.md', `${dir}/CHANGELOG.md`);
  }
  console.log('Mirrored CHANGELOG.md into both packages.');
}

execSync('npm install --package-lock-only --no-audit --no-fund', { stdio: 'inherit' });
execSync('npm run build:lib', { stdio: 'inherit' });
execSync('npm run build:themes', { stdio: 'inherit' });

console.log(`Workspace prepared for release v${version}.`);
